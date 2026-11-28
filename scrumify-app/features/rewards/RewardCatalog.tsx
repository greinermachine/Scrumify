const REWARDS = [
  { name: "$5 coffee shop gift card", points: 50 },
  { name: "$10 grocery gift card", points: 100 },
  { name: "$15 online gift card", points: 150 },
];

export default function RewardCatalog() {
  return (
    <section className="reward-catalog" aria-labelledby="rewards-heading">
      <h2 id="rewards-heading">Available rewards</h2>
      <ul>
        {REWARDS.map((reward) => (
          <li key={reward.name}>
            <strong>{reward.name}</strong>
            <span className="tag">{reward.points} points</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
