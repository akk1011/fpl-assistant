// GET /api/fpl/teams  -> [ {id, name, short_name} ]
module.exports = async function (req, res) {
  try {
    const rsp = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      headers: { "User-Agent": "FPL-Assistant/1.0 (+contact:you@example.com)" }
    });
    const data = await rsp.json();
    const out = (data.teams || []).map(t => ({ id: t.id, name: t.name, short_name: t.short_name }));
    res.setHeader("Cache-Control","s-maxage=900, stale-while-revalidate=86400");
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};
