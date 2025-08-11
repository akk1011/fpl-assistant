// GET /api/fpl/events  -> [ {id, name, deadline_time, is_next, is_current, finished, data_checked} ]
module.exports = async function (req, res) {
  try {
    const rsp = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      headers: { "User-Agent": "FPL-Assistant/1.0 (+contact:you@example.com)" }
    });
    const data = await rsp.json();
    const out = (data.events || []).map(e => ({
      id: e.id,
      name: e.name,
      deadline_time: e.deadline_time,
      is_next: e.is_next,
      is_current: e.is_current,
      finished: e.finished,
      data_checked: e.data_checked
    }));
    res.setHeader("Cache-Control","s-maxage=900, stale-while-revalidate=86400");
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};
