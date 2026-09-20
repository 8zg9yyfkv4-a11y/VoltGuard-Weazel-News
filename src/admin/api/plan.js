// api/plan.js
const express = require('express');
const { getGuildSettings } = require('../../bot/database');
const { PLANS, PLAN_ORDER, FEATURE_ROWS } = require('../../bot/planLimits');
const { verifyGuildAccess } = require('../middleware');

const router = express.Router();

router.get('/guilds/:guildId/plan', verifyGuildAccess, async (req, res) => {
  const settings = await getGuildSettings(req.params.guildId);
  const current = PLANS[settings.plan] ? settings.plan : 'free';
  res.json({ current, order: PLAN_ORDER, plans: PLANS, features: FEATURE_ROWS });
});

module.exports = router;
