// Turns YYYY-MM-DD into a short label like "Nov 16", adding the year when it isn't this year
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string, today: string) {
  const [year, month, day] = iso.split("-");
  const label = `${MONTHS[Number(month) - 1]} ${Number(day)}`;
  if (today && year !== today.slice(0, 4)) return `${label}, ${year}`;
  return label;
}
