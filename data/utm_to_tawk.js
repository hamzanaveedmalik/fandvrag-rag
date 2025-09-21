var Tawk_API = window.Tawk_API || {};
Tawk_API.onLoad = function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var attrs = {
      utm_source: params.get('utm_source') || document.referrer || 'direct',
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      landing_page: window.location.pathname + window.location.search,
      tz_offset_minutes: new Date().getTimezoneOffset() * -1
    };
    Object.keys(attrs).forEach(function(k){ if(!attrs[k]) delete attrs[k]; });
    Tawk_API.setAttributes(attrs, function(err){ /* optional */ });
  } catch (e) {}
};