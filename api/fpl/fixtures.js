export default async function handler(req, res) {
  const rsp = await fetch("https://fantasy.premierleague.com/api/fixtures/", {
    headers: { "User-Agent": "FPL-Assistant/1.0 (+contact:you@example.com)" }
  });
  const data = await rsp.json();
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=86400");
  res.status(200).json(data);
}
