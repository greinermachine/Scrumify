import { useEffect, useRef, useState } from "react";

type Reward = { id: string; name: string; points: number };
type Redemption = {
  id: number;
  request_id: string;
  reward_id: string;
  reward_name: string;
  points: number;
  redeemed_at: string;
};
type RewardsData = { rewards: Reward[]; redemptions: Redemption[]; points_balance: number };

type RewardCatalogProps = {
  token: string;
  active: boolean;
  onUnauthorized: () => void;
  refresh: () => void;
  refreshVersion: number;
};

export default function RewardCatalog({ token, active, onUnauthorized, refresh, refreshVersion }: RewardCatalogProps) {
  const [data, setData] = useState<RewardsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [redemptionError, setRedemptionError] = useState("");
  const [notice, setNotice] = useState("");
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const loadRequest = useRef<AbortController | null>(null);
  const redeemRequest = useRef<AbortController | null>(null);
  const requestIds = useRef(new Map<string, string>());

  useEffect(() => {
    if (!active || redeemRequest.current) return;
    const controller = new AbortController();
    loadRequest.current = controller;

    async function loadRewards() {
      try {
        const response = await fetch("/api/rewards/", {
          headers: { Authorization: `Token ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) { onUnauthorized(); return; }
        if (!response.ok) throw new Error();
        const rewards: RewardsData = await response.json();
        if (!controller.signal.aborted) {
          for (const entry of rewards.redemptions) {
            if (requestIds.current.get(entry.reward_id) === entry.request_id) {
              requestIds.current.delete(entry.reward_id);
            }
          }
          setData(rewards);
          setLoadError(false);
        }
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }

    void loadRewards();
    return () => controller.abort();
  }, [active, refreshVersion, token, onUnauthorized]);

  useEffect(() => () => redeemRequest.current?.abort(), []);

  async function redeem(reward: Reward) {
    if (redeemRequest.current) return;
    const controller = new AbortController();
    redeemRequest.current = controller;
    loadRequest.current?.abort();
    setRedeeming(reward.id);
    setRedemptionError("");
    setNotice("");
    try {
      // Reuse the same ID after a network error because the server may have saved the redemption.
      const requestId = requestIds.current.get(reward.id) ?? crypto.randomUUID();
      requestIds.current.set(reward.id, requestId);
      const response = await fetch("/api/rewards/", {
        method: "POST",
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reward_id: reward.id, request_id: requestId }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (response.status === 401) { onUnauthorized(); return; }
      if (response.status === 409) {
        const result: { error: string } = await response.json();
        if (controller.signal.aborted) return;
        requestIds.current.delete(reward.id);
        setRedemptionError(result.error);
        refresh();
        return;
      }
      if (!response.ok) throw new Error();
      const result: { redemption: Redemption; points_balance: number } = await response.json();
      if (controller.signal.aborted) return;
      requestIds.current.delete(reward.id);
      setData((current) => current && {
        ...current,
        points_balance: result.points_balance,
        redemptions: [result.redemption, ...current.redemptions.filter((entry) => entry.id !== result.redemption.id)]
          .sort((first, second) => second.id - first.id),
      });
      setNotice(`Redeemed ${result.redemption.reward_name} for ${result.redemption.points} points.`);
      refresh();
    } catch {
      if (!controller.signal.aborted) setRedemptionError("Could not redeem the reward. Try again.");
    } finally {
      redeemRequest.current = null;
      if (!controller.signal.aborted) setRedeeming(null);
    }
  }

  return (
    <>
      <section className="reward-catalog" aria-labelledby="rewards-heading">
        <h2 id="rewards-heading">Available rewards</h2>
        {loadError ? (
          <p role="alert">Could not load rewards. {" "}
            <button className="add-btn" type="button" onClick={refresh}>
              Try again
            </button>
          </p>
        ) : !data && <p>Loading rewards...</p>}
        {redemptionError && <p className="note" role="alert">{redemptionError}</p>}
        {notice && <p role="status">{notice}</p>}
        {data && (
          <>
            <p>Points balance: {data.points_balance}</p>
            <ul>
              {data.rewards.map((reward) => (
                <li key={reward.id}>
                  <strong className="reward-name">{reward.name}</strong>
                  <span className="tag">{reward.points} points</span>
                  <button className="add-btn" type="button" aria-label={`Redeem ${reward.name}`}
                    disabled={redeeming !== null || data.points_balance < reward.points}
                    onClick={() => void redeem(reward)}>
                    {redeeming === reward.id ? "Redeeming..." : "Redeem"}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {data && (
        <section className="reward-catalog redemption-history" aria-labelledby="redemptions-heading">
          <h2 id="redemptions-heading">Redemption history</h2>
          {data.redemptions.length === 0 ? <p className="empty">No rewards redeemed yet.</p> : (
            <ul>
              {data.redemptions.map((entry) => (
                <li key={entry.id}>
                  <strong className="reward-name">{entry.reward_name}</strong>
                  <span className="tag">{entry.points} points</span>
                  <time dateTime={entry.redeemed_at}>
                    {new Date(entry.redeemed_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
