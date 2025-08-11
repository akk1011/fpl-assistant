// Returns only what the GPT needs: small & Actions-friendly
module.exports = async function (req, res) {
  try {
    const rsp = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      headers: { "User-Agent": "FPL-Assistant/1.0 (+contact:you@example.com)" }
    });
    const data = await rsp.json();

    const events = (data.events || []).map(e => ({
      id: e.id,
      name: e.name,
      deadline_time: e.deadline_time,
      is_next: e.is_next,
      is_current: e.is_current,
      finished: e.finished,
      data_checked: e.data_checked
    }));

    const elements = (data.elements || []).map(p => ({
      id: p.id,
      web_name: p.web_name,
      team: p.team,
      element_type: p.element_type,
      status: p.status,                  // a/d/i/s/...
      now_cost: p.now_cost,
      form: p.form,
      points_per_game: p.points_per_game,
      selected_by_percent: p.selected_by_percent
    }));

    const teams = (data.teams || []).map(t => ({
      id: t.id,
      name: t.name,
      short_name: t.short_name
    }));

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=86400");
    res.status(200).json({ updated: new Date().toISOString(), events, elements, teams });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};
