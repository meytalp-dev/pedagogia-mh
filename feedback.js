/* ==========================================================================
   כפתור משוב על האתר — נטען בכל עמוד, מזריק את העיצוב ואת החלון בעצמו.
   השליחה הולכת ל-Apps Script שכותב לגיליון ושולח התראה למייל.
   אם אין כתובת / אין רשת — נופלים בחן לשליחה במייל, והטקסט לא הולך לאיבוד.
   ========================================================================== */
(function(){
  "use strict";

  /* ---- כתובת ה-Apps Script (אחרי פריסה — להדביק כאן את כתובת ה-/exec) ---- */
  var FEEDBACK_URL = "https://script.google.com/macros/s/AKfycbxVqzxpbZ4TceYHsG-Wots36fffixkrSnddYM9UjM6G8lYYLp_IK6xQDO7-6ErjQhNW6A/exec";
  var FALLBACK_MAIL = "meytalp@bethaarava.ort.org.il";
  var DRAFT_KEY = "site-feedback-draft";

  /* בדיקה בלי לגעת בקובץ:  כל-עמוד.html?fb=<כתובת ה-exec> */
  try{
    var q = new URLSearchParams(location.search).get("fb");
    if (q && /^https:\/\/script\.google\.com\//.test(q)) FEEDBACK_URL = q;
  }catch(e){}

  var TOPICS = [
    {id:"missing", label:"חסר תוכן"},
    {id:"wrong",   label:"אי־דיוק או טעות"},
    {id:"broken",  label:"תקלה טכנית"},
    {id:"idea",    label:"רעיון לשיפור"},
    {id:"other",   label:"אחר"}
  ];

  /* ------------------------------ עיצוב ------------------------------ */
  var CSS = [
    '.fb-btn{position:fixed;bottom:22px;right:22px;z-index:9000;display:inline-flex;align-items:center;gap:9px;',
      'padding:12px 18px;border:0;border-radius:999px;cursor:pointer;font:700 .95rem/1 inherit;color:#fff;',
      'background:linear-gradient(135deg,#124D7A,#087B9C);box-shadow:0 12px 30px rgba(13,59,102,.28);',
      'transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s}',
    '.fb-btn:hover{transform:translateY(-3px);box-shadow:0 18px 42px rgba(13,59,102,.34)}',
    '.fb-btn svg{width:20px;height:20px;flex:none}',
    '@media(max-width:640px){.fb-btn{padding:14px;bottom:16px;right:16px}.fb-btn .fb-lbl{display:none}}',

    '.fb-ov{position:fixed;inset:0;z-index:9001;display:none;align-items:center;justify-content:center;padding:20px;',
      'background:rgba(11,43,76,.55);backdrop-filter:blur(3px)}',
    '.fb-ov.on{display:flex;animation:fbFade .2s ease both}',
    '@keyframes fbFade{from{opacity:0}to{opacity:1}}',

    '.fb-modal{background:#fff;border-radius:20px;width:min(560px,100%);max-height:calc(100dvh - 40px);',
      'display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(13,59,102,.3);',
      'font-family:inherit;direction:rtl;text-align:right;animation:fbUp .32s cubic-bezier(.16,1,.3,1) both}',
    '@keyframes fbUp{from{opacity:0;transform:translateY(22px) scale(.97)}to{opacity:1;transform:none}}',

    '.fb-head{padding:20px 24px 16px;border-bottom:1px solid #D8E6F2;display:flex;align-items:flex-start;gap:12px}',
    '.fb-head h2{margin:0;font-size:1.15rem;font-weight:800;color:#0D3B66;line-height:1.3}',
    '.fb-head p{margin:5px 0 0;font-size:.87rem;color:#52687A;line-height:1.5}',
    '.fb-x{margin-inline-start:auto;width:34px;height:34px;flex:none;border:1px solid #D8E6F2;background:#fff;',
      'border-radius:10px;cursor:pointer;color:#0D3B66;display:grid;place-items:center;transition:background .15s}',
    '.fb-x:hover{background:#F2F7FC}',
    '.fb-x svg{width:15px;height:15px}',

    '.fb-body{padding:18px 24px 4px;overflow-y:auto;flex:1}',
    '.fb-lab{display:block;font-size:.82rem;font-weight:800;color:#0D3B66;margin:0 0 8px}',
    '.fb-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}',
    '.fb-chip{padding:8px 14px;border:1px solid #D8E6F2;background:#fff;border-radius:999px;cursor:pointer;',
      'font:600 .86rem/1 inherit;color:#52687A;transition:background .18s,border-color .18s,color .18s}',
    '.fb-chip:hover{border-color:#BED4E7;background:#F8FBFF}',
    '.fb-chip.on{background:#E8F2FF;border-color:#1677FF;color:#0D3B66;font-weight:800}',

    '.fb-ta{width:100%;min-height:120px;resize:vertical;padding:12px 14px;border:1px solid #D8E6F2;border-radius:12px;',
      'font:400 .95rem/1.6 inherit;color:#102A43;background:#fff;transition:border-color .15s,box-shadow .15s}',
    '.fb-ta:focus,.fb-in:focus{outline:0;border-color:#1677FF;box-shadow:0 0 0 3px rgba(22,119,255,.14)}',
    '.fb-ta.bad,.fb-in.bad{border-color:#EF5656;box-shadow:0 0 0 3px rgba(239,86,86,.13)}',
    '.fb-err{display:none;color:#C93B3B;font-size:.8rem;font-weight:700;margin-top:6px}',
    '.fb-err.on{display:block}',

    '.fb-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}',
    '@media(max-width:520px){.fb-two{grid-template-columns:1fr}}',
    '.fb-in{width:100%;padding:11px 13px;border:1px solid #D8E6F2;border-radius:12px;font:400 .9rem/1.4 inherit;color:#102A43}',
    '.fb-note{font-size:.78rem;color:#60778A;margin-top:10px;line-height:1.5}',
    '.fb-page{display:flex;align-items:center;gap:7px;margin-top:14px;padding:9px 12px;background:#F2F7FC;',
      'border-radius:10px;font-size:.78rem;color:#52687A}',
    '.fb-page svg{width:14px;height:14px;flex:none;color:#0A7799}',
    '.fb-page b{color:#0D3B66;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

    '.fb-foot{padding:16px 24px 20px;border-top:1px solid #D8E6F2;display:flex;gap:10px;align-items:center;background:#fff}',
    '.fb-send{padding:12px 26px;border:0;border-radius:12px;cursor:pointer;font:800 .95rem/1 inherit;color:#fff;',
      'background:linear-gradient(135deg,#124D7A,#087B9C);transition:transform .2s,opacity .2s}',
    '.fb-send:hover:not(:disabled){transform:translateY(-2px)}',
    '.fb-send:disabled{opacity:.55;cursor:default;transform:none}',
    '.fb-cancel{padding:12px 20px;border:1px solid #D8E6F2;background:#fff;border-radius:12px;cursor:pointer;',
      'font:700 .92rem/1 inherit;color:#52687A}',
    '.fb-cancel:hover{background:#F8FBFF}',

    '.fb-done{padding:44px 30px;text-align:center;display:none}',
    '.fb-done.on{display:block}',
    '.fb-ring{width:64px;height:64px;margin:0 auto 16px;border-radius:50%;display:grid;place-items:center;',
      'background:#E4FAF7;color:#12A794}',
    '.fb-ring svg{width:30px;height:30px}',
    '.fb-done h3{margin:0 0 8px;font-size:1.2rem;font-weight:800;color:#0D3B66}',
    '.fb-done p{margin:0;font-size:.92rem;color:#52687A;line-height:1.6}',
    '.fb-done a{color:#0A7799;font-weight:700}',
    '.fb-modal.sent .fb-body,.fb-modal.sent .fb-foot,.fb-modal.sent .fb-head p{display:none}',

    '.fb-btn:focus-visible,.fb-chip:focus-visible,.fb-send:focus-visible,.fb-cancel:focus-visible,',
      '.fb-x:focus-visible{outline:3px solid #1677FF;outline-offset:3px}',
    '@media (prefers-reduced-motion: reduce){.fb-btn,.fb-modal,.fb-ov{animation:none!important;transition:none!important}}',
    /* בנייד הכפתור הצף יושב מעל סוף העמוד — מרווח קטן בפוטר */
    '@media(max-width:960px){.foot{padding-bottom:120px}}'
  ].join("");

  /* ------------------------------ אייקוני קו ------------------------------ */
  var I = {
    bubble:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.6L3 21l1.7-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"/><path d="M8.5 10.5h7M8.5 14h4"/></svg>',
    x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5"/></svg>'
  };

  /* ------------------------------ בנייה ------------------------------ */
  function build(){
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fb-btn";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-label", "משוב על האתר");
    btn.innerHTML = I.bubble + '<span class="fb-lbl">משוב על האתר</span>';

    var ov = document.createElement("div");
    ov.className = "fb-ov";
    /* מחוץ למפת העמוד: pagenav סורק h2 בכל המסמך, וכותרת המודל
       הזה הופיעה ככרטיסייה "מה חסר לך באתר?" בפס הניווט. */
    ov.setAttribute("data-pn-skip", "");
    ov.innerHTML =
      '<div class="fb-modal" role="dialog" aria-modal="true" aria-labelledby="fbTitle">' +
        '<div class="fb-head">' +
          '<div>' +
            '<h2 id="fbTitle">מה חסר לך באתר?</h2>' +
            '<p>כל הערה עוזרת — תוכן שחסר, פרט לא מדויק, קישור שבור או רעיון לשיפור.</p>' +
          '</div>' +
          '<button type="button" class="fb-x" aria-label="סגירה">' + I.x + '</button>' +
        '</div>' +

        '<div class="fb-body">' +
          '<span class="fb-lab">על מה מדובר?</span>' +
          '<div class="fb-chips" role="group" aria-label="סוג המשוב">' +
            TOPICS.map(function(t){
              return '<button type="button" class="fb-chip" data-topic="' + t.id + '" aria-pressed="false">' + t.label + '</button>';
            }).join("") +
          '</div>' +

          '<label class="fb-lab" for="fbText">המשוב שלך</label>' +
          '<textarea id="fbText" class="fb-ta" placeholder="לדוגמה: בעמוד תחומי הדעת חסרה תוכנית הלימודים במתמטיקה…"></textarea>' +
          '<div class="fb-err" id="fbErr">נא לכתוב כמה מילים על המשוב</div>' +

          '<div class="fb-two">' +
            '<input class="fb-in" id="fbName" type="text" placeholder="שם (לא חובה)" autocomplete="name">' +
            '<input class="fb-in" id="fbMail" type="email" placeholder="אימייל לחזרה (לא חובה)" autocomplete="email">' +
          '</div>' +
          '<div class="fb-err" id="fbMailErr">כתובת האימייל לא נראית תקינה</div>' +
          '<p class="fb-note">אפשר לשלוח גם בעילום שם. האימייל נשמר רק כדי לחזור אליך בתשובה.</p>' +

          '<div class="fb-page">' + I.doc + '<span>נשלח מהעמוד:</span><b id="fbPage"></b></div>' +
        '</div>' +

        '<div class="fb-foot">' +
          '<button type="button" class="fb-send">שליחת המשוב</button>' +
          '<button type="button" class="fb-cancel">ביטול</button>' +
        '</div>' +

        '<div class="fb-done">' +
          '<div class="fb-ring">' + I.check + '</div>' +
          '<h3 id="fbDoneTitle">תודה! המשוב נקלט</h3>' +
          '<p id="fbDoneText">נקרא כל משוב ונשתמש בו כדי לשפר את האתר.</p>' +
        '</div>' +
      '</div>';

    document.body.appendChild(btn);
    document.body.appendChild(ov);
    wire(btn, ov);
  }

  /* ------------------------------ התנהגות ------------------------------ */
  function wire(btn, ov){
    var modal   = ov.querySelector(".fb-modal"),
        text    = ov.querySelector("#fbText"),
        err     = ov.querySelector("#fbErr"),
        mail    = ov.querySelector("#fbMail"),
        mailErr = ov.querySelector("#fbMailErr"),
        name    = ov.querySelector("#fbName"),
        send    = ov.querySelector(".fb-send"),
        chips   = [].slice.call(ov.querySelectorAll(".fb-chip")),
        topic   = "";

    ov.querySelector("#fbPage").textContent = (document.title || location.pathname).split("·")[0].trim();

    /* מילוי מראש משם שכבר הוקלד באתר, ומטיוטה שלא נשלחה */
    try{
      var n = localStorage.getItem("melave-name"); if (n) name.value = n;
      var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (d && d.text){
        text.value = d.text;
        if (d.name) name.value = d.name;
        if (d.mail) mail.value = d.mail;
      }
    }catch(e){}

    function open(){
      ov.classList.add("on");
      document.body.style.overflow = "hidden";
      setTimeout(function(){ text.focus(); }, 60);
    }

    function close(){
      ov.classList.remove("on");
      document.body.style.overflow = "";
      btn.focus();
      if (modal.classList.contains("sent")){
        modal.classList.remove("sent");
        ov.querySelector(".fb-done").classList.remove("on");
        text.value = "";
        topic = "";
        chips.forEach(function(c){ c.classList.remove("on"); c.setAttribute("aria-pressed", "false"); });
        send.disabled = false;
        send.textContent = "שליחת המשוב";
      }
    }

    btn.addEventListener("click", open);
    ov.querySelector(".fb-x").addEventListener("click", close);
    ov.querySelector(".fb-cancel").addEventListener("click", close);
    ov.addEventListener("click", function(e){ if (e.target === ov) close(); });
    document.addEventListener("keydown", function(e){
      if (!ov.classList.contains("on")) return;
      if (e.key === "Escape") close();
      else if (e.key === "Tab") trap(e, modal);
    });

    chips.forEach(function(c){
      c.addEventListener("click", function(){
        var was = c.classList.contains("on");
        chips.forEach(function(o){ o.classList.remove("on"); o.setAttribute("aria-pressed", "false"); });
        if (was){ topic = ""; return; }
        c.classList.add("on");
        c.setAttribute("aria-pressed", "true");
        topic = c.dataset.topic;
      });
    });

    function saveDraft(){
      try{ localStorage.setItem(DRAFT_KEY, JSON.stringify({text:text.value, name:name.value, mail:mail.value})); }catch(e){}
    }
    text.addEventListener("input", function(){
      if (text.value.trim().length >= 5){ text.classList.remove("bad"); err.classList.remove("on"); }
      saveDraft();
    });
    name.addEventListener("input", saveDraft);
    mail.addEventListener("input", saveDraft);

    function done(title, message, isHtml){
      modal.classList.add("sent");
      ov.querySelector(".fb-done").classList.add("on");
      ov.querySelector("#fbDoneTitle").textContent = title;
      var p = ov.querySelector("#fbDoneText");
      if (isHtml) p.innerHTML = message; else p.textContent = message;
    }

    send.addEventListener("click", function(){
      var body   = text.value.trim();
      var okText = body.length >= 5;
      var okMail = !mail.value.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(mail.value.trim());
      text.classList.toggle("bad", !okText); err.classList.toggle("on", !okText);
      mail.classList.toggle("bad", !okMail); mailErr.classList.toggle("on", !okMail);
      if (!okText){ text.focus(); return; }
      if (!okMail){ mail.focus(); return; }

      var picked = TOPICS.filter(function(t){ return t.id === topic; })[0];
      var data = {
        kind:   "site-feedback",
        topic:  picked ? picked.label : "כללי",
        text:   body,
        name:   name.value.trim(),
        email:  mail.value.trim(),
        page:   (document.title || "").trim(),
        url:    location.href,
        device: navigator.userAgent
      };

      send.disabled = true;
      send.textContent = "שולח…";

      post(data).then(function(r){
        if (r && r.ok){
          try{ localStorage.removeItem(DRAFT_KEY); }catch(e){}
          if (data.name){ try{ localStorage.setItem("melave-name", data.name); }catch(e){} }
          done("תודה" + (data.name ? ", " + data.name.split(" ")[0] : "") + "! המשוב נקלט",
               "נקרא כל משוב ונשתמש בו כדי לשפר את האתר." + (data.email ? " נחזור אליך למייל שהשארת." : ""));
        } else {
          done("נשלח אלינו במייל?", mailtoHtml(data), true);
        }
      });
    });
  }

  function mailtoHtml(d){
    var lines = [d.text, "", "עמוד: " + d.page, d.url,
                 d.name  ? "שם: " + d.name : "",
                 d.email ? "אימייל: " + d.email : ""];
    var href = "mailto:" + FALLBACK_MAIL +
               "?subject=" + encodeURIComponent("משוב על האתר — " + d.topic) +
               "&body="    + encodeURIComponent(lines.filter(Boolean).join("\n"));
    return 'לא הצלחנו לשלוח כרגע — המשוב שלך נשמר בדפדפן ולא ילך לאיבוד.<br>' +
           '<a href="' + href + '">שליחה במייל בלחיצה אחת</a>';
  }

  function post(d){
    if (!FEEDBACK_URL) return Promise.resolve({ok:false, error:"no_api"});
    return fetch(FEEDBACK_URL, {
      method:  "POST",
      headers: {"Content-Type":"text/plain;charset=utf-8"},  /* טקסט רגיל — כדי לא לעורר preflight */
      body:    JSON.stringify(d)
    }).then(function(r){ return r.json(); })
      .catch(function(){ return {ok:false, error:"network"}; });
  }

  function trap(e, modal){
    var f = [].slice.call(modal.querySelectorAll("button,textarea,input,a[href]"))
              .filter(function(el){ return el.offsetParent !== null && !el.disabled; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
