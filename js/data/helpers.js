/**
 * Shared date formatter for adset start/end_time strings.
 * Declared module-level so render_campaign.js doesn't re-create it inside the adset loop.
 */
function _formatAdsetDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

/**
 * Skeleton Loader Helper — toggle display (không remove/recreate để tránh layout thrash)
 */
function toggleSkeletons(scopeSelector, isLoading) {
  const scope = document.querySelector(scopeSelector);
  if (!scope) return;

  // Cache cards list on the element to avoid re-querying + re-filtering on every toggle.
  // Reset cache when starting a new load cycle (isLoading=true) so newly inserted
  // cards (e.g. re-opened detail panel) are always picked up fresh.
  if (isLoading) scope._cachedCards = null;

  if (!scope._cachedCards) {
    let raw = scope.querySelectorAll(".dom_inner");
    if (scopeSelector === ".dom_dashboard" || scopeSelector === ".dom_container") {
      raw = Array.from(raw).filter((c) => !c.closest("#google_ads_container"));
    }
    scope._cachedCards = Array.from(raw);
  }
  const cards = scope._cachedCards;

  if (isLoading) {
    scope.classList.add("is-loading");
    cards.forEach((card) => {
      card.classList.add("is-loading");

      let skeleton = card.querySelector(".skeleton-container");
      if (!skeleton) {
        skeleton = document.createElement("div");
        skeleton.className = "skeleton-container";
        const isChart = card.querySelector("canvas");
        const isList  = card.querySelector("ul.dom_toplist");

        if (isChart) {
          skeleton.innerHTML = `
            <div class="skeleton skeleton-title" style="margin-bottom:2rem"></div>
            <div class="skeleton skeleton-chart"></div>
          `;
        } else if (isList || card.id === "detail_total_report" || card.id === "interaction_stats_card") {
          skeleton.innerHTML = `
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width:70%"></div>
          `;
        } else {
          skeleton.innerHTML = `
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width:80%"></div>
          `;
        }
        card.prepend(skeleton);
      }

      skeleton.style.display = "";
      Array.from(card.children).forEach((child) => {
        if (!child.classList.contains("skeleton-container")) child.classList.add("hide-on-load");
      });
    });
  } else {
    scope.classList.remove("is-loading");
    cards.forEach((card) => {
      card.classList.remove("is-loading");
      const skeleton = card.querySelector(".skeleton-container");
      if (skeleton) skeleton.style.display = "none";
      card.querySelectorAll(".hide-on-load").forEach((el) => el.classList.remove("hide-on-load"));
    });
  }
}

function getAction(actions, type) {
  if (!actions || !Array.isArray(actions)) return 0;
  for (let i = 0; i < actions.length; i++) {
    if (actions[i].action_type === type) return +actions[i].value || 0;
  }
  return 0;
}

async function runBatchesWithLimit(tasks, limit = CONCURRENCY_LIMIT) {
  const results = [];
  let i = 0;

  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      try {
        results[idx] = await tasks[idx]();
      } catch (err) {
        console.warn(`Batch ${idx} failed:`, err.message);
        results[idx] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function getResults(item, goal) {
  if (!item) return 0;
  const insights = item.insights?.data?.[0] || item.insights || item;
  if (!insights) return 0;

  let rawGoal = (
    goal ||
    (typeof VIEW_GOAL !== "undefined" ? VIEW_GOAL : "") ||
    item.optimization_goal ||
    insights.optimization_goal ||
    item.objective ||
    insights.objective ||
    item.optimizationGoal ||
    ""
  ).toString().trim();

  let optGoal = rawGoal.toUpperCase();

  const itemName = (item.name || item.ad_name || item.campaign_name || insights.campaign_name || "").toLowerCase();
  const isLikeCampaign =
    optGoal.includes("LIKE") ||
    optGoal.includes("FOLLOW") ||
    /like\s*page|page\s*like|likepage|follow/i.test(itemName) ||
    ((item.objective || insights.objective || "").toUpperCase() === "PAGE_LIKES");

  // If goal is a group name (e.g. "Lead Form"), resolve to a technical goal key
  let goalKey = GOAL_GROUP_LOOKUP[optGoal] || GOAL_GROUP_LOOKUP[rawGoal];
  if (!goalKey && goalMapping[optGoal]) {
    goalKey = optGoal;
    optGoal = goalMapping[goalKey][0];
  }
  if (!goalKey && isLikeCampaign) {
    goalKey = "Pagelike";
    optGoal = "PAGE_LIKES";
  }

  if (optGoal === "REACH" || goalKey === "Awareness") {
    return +(insights.reach || insights.impressions || 0);
  }
  if (optGoal === "IMPRESSIONS") return +insights.impressions || 0;

  const actions  = insights.actions || {};
  let resultType = resultMapping[optGoal] || resultMapping[rawGoal];

  if (!resultType && goalKey) resultType = GOAL_KEY_RESULT_MAP[goalKey];
  if (!resultType && isLikeCampaign) resultType = "page_like";
  if (!resultType) resultType = resultMapping.DEFAULT;

  const getVal = (type) => {
    if (Array.isArray(actions)) {
      const found = actions.find((a) => a && a.action_type === type);
      return found ? +found.value || 0 : 0;
    }
    return actions && typeof actions === "object" ? +actions[type] || 0 : 0;
  };

  if (resultType === "page_like" || goalKey === "Pagelike" || isLikeCampaign) {
    // Facebook page likes & follows
    const fbLikes = Math.max(
      getVal("page_like"),
      getVal("onsite_conversion.page_like"),
      getVal("like")
    );
    const fbFollows = Math.max(
      getVal("page_follow"),
      getVal("onsite_conversion.page_follow"),
      getVal("follow"),
      getVal("follows"),
      getVal("onsite_conversion.follow")
    );
    // Instagram profile follows
    const igFollows = Math.max(
      getVal("instagram_profile_follow"),
      getVal("onsite_conversion.instagram_profile_follow")
    );

    // Đối với FB Page: lấy max giữa like và follow để tránh đếm trùng 1 hành vi trên Trang;
    // cộng thêm lượt follow Instagram nếu có.
    const fbTotal = Math.max(fbLikes, fbFollows);
    let total = fbTotal + igFollows;

    // Fallback: quét các key thay thế nếu total = 0
    if (total === 0) {
      const fallbackKeys = [
        "page_like", "like", "page_follow", "follow", "follows",
        "instagram_profile_follow", "onsite_conversion.page_like",
        "onsite_conversion.page_follow", "onsite_conversion.follow",
        "onsite_conversion.instagram_profile_follow"
      ];
      for (const k of fallbackKeys) {
        const v = getVal(k);
        if (v > 0) total = Math.max(total, v);
      }
    }

    if (total === 0 && item.follow > 0) {
      total = +item.follow || 0;
    }

    return total;
  }

  let finalRes = 0;
  if (Array.isArray(actions)) {
    if (insights[resultType]) {
      const sp = insights[resultType];
      if (Array.isArray(sp)) finalRes = sp.reduce((s, a) => s + (+a.value || 0), 0);
      else if (typeof sp === "number" || typeof sp === "string") finalRes = +sp;
      else if (sp.value) finalRes = +sp.value;
    }

    if (!finalRes) {
      for (let i = 0; i < actions.length; i++) {
        if (actions[i].action_type === resultType) {
          finalRes = +actions[i].value || 0;
          break;
        }
      }
    }

    if (!finalRes && goalKey) {
      for (const g of goalMapping[goalKey]) {
        const altType = resultMapping[g];
        if (!altType) continue;
        if (insights[altType]) {
          const asp = insights[altType];
          if (Array.isArray(asp)) {
            finalRes = asp.reduce((s, a) => s + (+a.value || 0), 0);
            if (finalRes) break;
          }
        }
        for (let i = 0; i < actions.length; i++) {
          if (actions[i].action_type === altType) {
            finalRes = +actions[i].value || 0;
            break;
          }
        }
        if (finalRes) break;
      }
    }
    // Sales fallback: try fb_pixel_purchase if fb_pixel_custom is 0
    if (!finalRes && goalKey === 'Sales') {
      for (let i = 0; i < actions.length; i++) {
        if (actions[i].action_type === 'offsite_conversion.fb_pixel_purchase') {
          finalRes = +actions[i].value || 0;
          break;
        }
      }
    }
  } else {
    if (actions[resultType]) finalRes = +actions[resultType];
    if (!finalRes && goalKey) {
      for (const g of goalMapping[goalKey]) {
        const altType = resultMapping[g];
        if (altType && actions[altType]) {
          finalRes = +actions[altType];
          break;
        }
      }
    }
  }

  // Fallback for anonymous breakdown objects (e.g. in hour/date charts) where goal is not specified
  if (finalRes === 0) {
    const likeVal = Math.max(
      getVal("page_like"),
      getVal("onsite_conversion.page_like"),
      getVal("like"),
      getVal("page_follow"),
      getVal("follow")
    );
    const hasLeadOrSale = getVal("lead") || getVal("onsite_conversion.lead_grouped") || getVal("purchase") || getVal("omni_purchase");
    if (likeVal > 0 && !hasLeadOrSale) {
      return likeVal;
    }
  }

  return finalRes;
}
