(() => {
  "use strict";

  const CFG = Object.assign({
    DEFAULT_CHARACTER_ID: "le-hoan",
    API_BASE_URL: "",
    KIOSK_IDLE_MS: 180000,
    ENABLE_KIOSK_RESET: true
  }, window.HISTORY_APP_CONFIG || {});

  const $ = id => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const characterId = new URLSearchParams(location.search).get("character") || CFG.DEFAULT_CHARACTER_ID;
  const apiBase = String(CFG.API_BASE_URL || "").replace(/\/$/, "");

  const state = {
    profile: null,
    sourceMap: {},
    lang: "vi",
    playerName: "Người học",
    sessionId: (crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    sessionStartedAt: 0,
    sessionSummarySent: false,
    mainStarted: false,
    audioEnabled: true,
    activePanel: null,
    online: null,
    currentTts: null,
    ttsUrl: null,
    narrationWasPlaying: false,
    qaCount: 0,
    whatifCount: 0,
    roleplayCount: 0,
    questions: [],
    journey: { observe: false, profile: false, qa: false, whatif: false, roleplay: false },
    whatifHistory: [],
    roleHistory: [],
    roleTurn: 0,
    roleStartedAt: 0,
    idleTimer: null,
    clickContext: null,
    speechRecognition: null,
    speechTarget: null,
    dust: { revealed: false, brushing: false, drawing: false, eraseEvents: 0, stream: null, raf: 0 }
  };

  const VI = {
    start:"Bắt đầu khám phá", online:"● Đã kết nối", offline:"● Mất kết nối AI", checking:"● Đang kiểm tra",
    complete:"Hoàn tất", connecting:"Đang tra cứu dữ liệu nền…", analyzing:"Đang phân tích giả định…", role:"Đang xây dựng tình huống…",
    mic:"🎙 Mic", micStop:"■ Chốt", noSpeech:"Trình duyệt không hỗ trợ nhận dạng giọng nói.", session:"Phiên",
    source:"Nguồn", confidence:"Mức tin cậy", evidence:"Dữ kiện hỗ trợ", evidenceNote:"Ghi chú kiểm chứng",
    baseline:"Mốc lịch sử có thật", changed:"Điều kiện thay đổi", consequences:"Chuỗi hậu quả có thể xảy ra", uncertainty:"Điểm chưa thể kết luận", method:"Cách đọc mô phỏng",
    feedback:"Nhận xét quyết sách", contextSources:"Nguồn cho bối cảnh có thật", dimension:"Cân nhắc bốn mặt", conclusion:"Tổng kết",
    networkFail:"Không kết nối được phần AI. Hồ sơ, nguồn và mô hình 3D vẫn hoạt động.",
    modelTitle:"Đang chuẩn bị hiện vật 3D…", modelLoading:"Đang tải mô hình GLB…", modelRetry:"Tải lại mô hình", modelError:"Không tải được GLB. Kiểm tra thư mục assets và chữ hoa/chữ thường của tên tệp.",
    introStamp:"HỒ SƠ KHẢO CỨU", introEyebrow:"BẢO TÀNG LỊCH SỬ SỐ TƯƠNG TÁC", playerLabel:"Tên người khám phá", playerPlaceholder:"Nhập tên của bạn…",
    dustEyebrow:"KHÁM PHÁ HIỆN VẬT", dustTitle:"Thổi vào micro hoặc quét lớp bụi thời gian", dustHint:"Âm thanh quét và thổi đã được tắt. Micro chỉ dùng để nhận cường độ hơi thổi.", brush:"Dùng chổi", skip:"Bỏ qua", brushReady:"Chế độ quét đã sẵn sàng: kéo chuột hoặc ngón tay trên lớp bụi.", micUnavailable:"Không dùng được micro — bạn vẫn có thể quét bằng chuột hoặc ngón tay.",
    navProfile:"Hồ sơ", navProfileHint:"Thông tin & nguồn", functionDockLabel:"CÔNG CỤ HỌC TẬP", navQa:"Tra cứu sử liệu", navQaHint:"Đặt câu hỏi lịch sử", navWhatif:"Giả định lịch sử", navWhatifHint:"Phân tích “nếu như”", navRoleplay:"Nhập vai quyết sách", navRoleplayHint:"Chọn phương án xử lý",
    profileEyebrow:"HỒ SƠ NHÂN VẬT", profileLead:"Hồ sơ này ưu tiên dữ kiện có mã nguồn và ghi rõ điểm chưa thống nhất.", factDate:"Niên đại", factDynasty:"Triều đại", factReign:"Trị vì", factCapital:"Kinh đô",
    timelineHeading:"Dòng thời gian", timelineHint:"Dữ kiện gắn nguồn", fullInfoHeading:"Thông tin đầy đủ", fullInfoHint:"Phân biệt sự kiện, lời bình và điểm chưa thống nhất", sourceReminderPrefix:"Mọi chi tiết dùng trong bài học nên được kiểm tra lại bằng nguồn được liệt kê ở mục ", sourceReminderButton:"Nguồn sử liệu",
    qaEyebrow:"HOẠT ĐỘNG 1", qaHeading:"Tra cứu sử liệu", qaLead:"Câu trả lời phải chỉ ra dữ kiện nền, nguồn hỗ trợ và phần cần kiểm chứng.", qaPlaceholder:"Ví dụ: Vì sao Lê Hoàn lên ngôi năm 980?", qaSend:"Tra cứu", qaEmpty:"Chọn một câu gợi ý hoặc đặt câu hỏi của bạn.",
    whatifEyebrow:"HOẠT ĐỘNG 2", whatifHeading:"Giả định lịch sử", whatifLead:"Mô phỏng để học quan hệ nguyên nhân–hậu quả. Không phải dự đoán và không dùng phần trăm giả tạo.", whatifPlaceholder:"Nếu một điều kiện lịch sử thay đổi thì…", whatifSend:"Phân tích", whatifEmpty:"Mỗi lần chỉ thay đổi một điều kiện để phân tích rõ hơn.",
    roleplayEyebrow:"HOẠT ĐỘNG 3", roleSimulation:"⚑ Mô phỏng giáo dục", roleEmpty:"Nhấn bắt đầu để nhận tình huống đầu tiên.", roleStart:"Bắt đầu tình huống", roleExport:"Xuất phiếu học tập", situation:"Tình huống", turn:"Lượt", military:"Quân sự", diplomacy:"Ngoại giao", publicSupport:"Lòng dân", logistics:"Hậu cần",
    sourcesEyebrow:"KIỂM CHỨNG", sourcesHeading:"Nguồn sử liệu mẫu", sourcesLead:"Nguồn được phân loại theo vai trò. Nguồn di sản hiện đại không tự động thay thế chính sử cho chi tiết thế kỷ X.", sourceOpen:"Mở nguồn gốc ↗", noDirectSource:"Không có mã nguồn trực tiếp trong phản hồi này.",
    guideEyebrow:"HƯỚNG DẪN", guideHeading:"Cách khám phá", guideHtml:"<li><b>Quan sát 3D:</b> kéo để xoay, cuộn hoặc chụm để phóng to.</li><li><b>Hồ sơ:</b> đọc dòng thời gian, nội dung đầy đủ và mở nguồn để đối chiếu.</li><li><b>Tra cứu:</b> hệ thống chỉ dùng kho dữ kiện đã biên tập và phải chỉ nguồn.</li><li><b>Giả định:</b> thay đổi một điều kiện, xem chuỗi hậu quả có thể xảy ra.</li><li><b>Nhập vai:</b> cân nhắc quân sự, ngoại giao, lòng dân và hậu cần.</li>", guideNote:"Nếu mạng/API lỗi, mô hình 3D, hồ sơ và nguồn sử liệu vẫn hoạt động.<br><br><b>Lưu ý âm thanh:</b> giọng đọc phản hồi do máy chủ tạo là giọng tổng hợp bằng AI, không phải giọng người thật.",
    journeyEyebrow:"HÀNH TRÌNH", journeyHeading:"Tiến trình khám phá", journeyFinish:"Xem tổng kết hành trình", journeyFinishHint:"Thời gian • hoạt động • tiến trình",
    journeyObserve:"Quan sát hiện vật 3D", journeyProfile:"Đọc hồ sơ và dòng thời gian", journeyQa:"Tra cứu sử liệu", journeyWhatif:"Thử giả định lịch sử", journeyRoleplay:"Hoàn thành nhập vai",
    summaryEyebrow:"TỔNG KẾT", summaryTitle:"Hành trình khám phá", summaryNote:"Các phần “Giả định lịch sử” và “Nhập vai” là mô phỏng giáo dục, không phải diễn biến lịch sử đã xảy ra.", summaryPdf:"Xuất PDF", newSession:"Phiên mới", time:"Thời gian", inquiry:"Tra cứu", counterfactual:"Giả định", roleplayCount:"Nhập vai", latestContent:"Nội dung gần nhất", uses:"lượt", sessions:"phiên",
    feasibility:"Khả thi", historicalRisk:"Rủi ro lịch sử", uncertaintyShort:"Bất định", learner:"Người học", sessionCode:"Mã phiên", worksheet:"Phiếu học tập", decision:"Quyết định", response:"Phản hồi", close:"Đóng",
    toolGuide:"Hướng dẫn", toolSources:"Nguồn sử liệu", toolJourney:"Tiến trình", toolReset:"Góc nhìn ban đầu", toolAudio:"Âm thanh", toolLanguage:"Ngôn ngữ", toolFinish:"Kết thúc phiên", defaultLearner:"Người học", headerStamp:"HỒ SƠ", newSessionBadge:"Phiên mới", languageReset:"Đã đổi ngôn ngữ. Nội dung hoạt động được làm mới để tránh trộn hai ngôn ngữ."
  };
  const EN = {
    start:"Start exploring", online:"● Connected", offline:"● AI offline", checking:"● Checking",
    complete:"Complete", connecting:"Checking the curated evidence…", analyzing:"Analyzing the counterfactual…", role:"Building the situation…",
    mic:"🎙 Mic", micStop:"■ Confirm", noSpeech:"Speech recognition is not supported in this browser.", session:"Session",
    source:"Source", confidence:"Confidence", evidence:"Supporting evidence", evidenceNote:"Verification note",
    baseline:"Historical baseline", changed:"Changed condition", consequences:"Possible consequence chain", uncertainty:"What cannot be concluded", method:"How to read this simulation",
    feedback:"Decision feedback", contextSources:"Sources for the historical context", dimension:"Four-dimension review", conclusion:"Summary",
    networkFail:"AI is unavailable. The 3D model, profile and sources still work.",
    modelTitle:"Preparing the 3D exhibit…", modelLoading:"Loading the GLB model…", modelRetry:"Reload model", modelError:"The GLB model could not be loaded. Check the assets folder and filename letter case.",
    introStamp:"RESEARCH FILE", introEyebrow:"INTERACTIVE DIGITAL HISTORY MUSEUM", playerLabel:"Explorer name", playerPlaceholder:"Enter your name…",
    dustEyebrow:"REVEAL THE EXHIBIT", dustTitle:"Blow into the microphone or sweep away the dust of time", dustHint:"Sweep and blow sounds are disabled. The microphone is used only to detect blowing intensity.", brush:"Use brush", skip:"Skip", brushReady:"Brush mode is ready: drag your mouse or finger across the dust layer.", micUnavailable:"Microphone is unavailable — you can still sweep with your mouse or finger.",
    navProfile:"Profile", navProfileHint:"Information & sources", functionDockLabel:"LEARNING TOOLS", navQa:"Historical inquiry", navQaHint:"Ask a history question", navWhatif:"Counterfactual", navWhatifHint:"Analyze a “what if”", navRoleplay:"Decision role-play", navRoleplayHint:"Choose a course of action",
    profileEyebrow:"HISTORICAL PROFILE", profileLead:"This profile prioritizes source-linked evidence and clearly marks points that remain disputed.", factDate:"Dates", factDynasty:"Dynasty", factReign:"Reign", factCapital:"Capital",
    timelineHeading:"Timeline", timelineHint:"Source-linked evidence", fullInfoHeading:"Full profile", fullInfoHint:"Separating events, commentary, and disputed points", sourceReminderPrefix:"Details used in learning activities should be checked against the materials listed under ", sourceReminderButton:"Historical sources",
    qaEyebrow:"ACTIVITY 1", qaHeading:"Historical inquiry", qaLead:"Each answer must identify supporting evidence, sources, and anything that still needs verification.", qaPlaceholder:"Example: Why did Lê Hoàn take the throne in 980?", qaSend:"Search", qaEmpty:"Choose a suggested question or ask your own.",
    whatifEyebrow:"ACTIVITY 2", whatifHeading:"Historical counterfactual", whatifLead:"Use the simulation to study cause and effect. It is not a prediction and does not use invented percentages.", whatifPlaceholder:"What if one historical condition changed…", whatifSend:"Analyze", whatifEmpty:"Change only one condition at a time for a clearer analysis.",
    roleplayEyebrow:"ACTIVITY 3", roleSimulation:"⚑ Educational simulation", roleEmpty:"Start to receive the first situation.", roleStart:"Start situation", roleExport:"Export worksheet", situation:"Situation", turn:"Turn", military:"Military", diplomacy:"Diplomacy", publicSupport:"Public support", logistics:"Logistics",
    sourcesEyebrow:"VERIFY", sourcesHeading:"Sample historical sources", sourcesLead:"Sources are classified by role. A modern heritage source does not automatically replace historical chronicles for 10th-century details.", sourceOpen:"Open original source ↗", noDirectSource:"No direct source ID is attached to this response.",
    guideEyebrow:"GUIDE", guideHeading:"How to explore", guideHtml:"<li><b>3D exhibit:</b> drag to rotate; scroll or pinch to zoom.</li><li><b>Profile:</b> read the timeline and full profile, then open sources to compare.</li><li><b>Inquiry:</b> the system uses only the curated evidence base and must identify sources.</li><li><b>Counterfactual:</b> change one condition and examine a possible chain of consequences.</li><li><b>Role-play:</b> weigh military, diplomacy, public support, and logistics.</li>", guideNote:"If the network or AI API is unavailable, the 3D model, profile, and historical sources still work.<br><br><b>Audio note:</b> spoken AI responses use a synthetic voice generated by the server; it is not a real person's voice.",
    journeyEyebrow:"JOURNEY", journeyHeading:"Exploration progress", journeyFinish:"View journey summary", journeyFinishHint:"Time • activities • progress",
    journeyObserve:"Observe the 3D exhibit", journeyProfile:"Read the profile and timeline", journeyQa:"Use historical inquiry", journeyWhatif:"Try a counterfactual", journeyRoleplay:"Complete the role-play",
    summaryEyebrow:"SUMMARY", summaryTitle:"Exploration journey", summaryNote:"“Historical counterfactual” and “Role-play” are educational simulations, not events that actually occurred.", summaryPdf:"Export PDF", newSession:"New session", time:"Time", inquiry:"Inquiry", counterfactual:"Counterfactual", roleplayCount:"Role-play", latestContent:"Latest topic", uses:"uses", sessions:"sessions",
    feasibility:"Feasibility", historicalRisk:"Historical risk", uncertaintyShort:"Uncertainty", learner:"Learner", sessionCode:"Session ID", worksheet:"Learning worksheet", decision:"Decision", response:"Response", close:"Close",
    toolGuide:"Guide", toolSources:"Historical sources", toolJourney:"Progress", toolReset:"Reset camera", toolAudio:"Audio", toolLanguage:"Language", toolFinish:"End session", defaultLearner:"Learner", headerStamp:"FILE", newSessionBadge:"New session", languageReset:"Language changed. Activity content was reset to prevent mixed-language text."
  };
  const t = key => (state.lang === "en" ? EN : VI)[key] || key;
  const localValue = (obj, viKey, enKey = viKey + "En") => state.lang === "en" ? (obj?.[enKey] ?? obj?.[viKey] ?? "") : (obj?.[viKey] ?? obj?.[enKey] ?? "");
  const displayName = p => state.lang === "en" ? (p?.englishName || p?.name || "") : (p?.name || p?.englishName || "");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[ch]));
  }
  function formatDuration(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2,"0")}`;
  }
  function toast(message, ms = 2600) {
    const el = $("toast"); el.textContent = message; el.classList.remove("hidden");
    clearTimeout(el._timer); el._timer = setTimeout(() => el.classList.add("hidden"), ms);
  }


  function applyStaticLanguage() {
    document.documentElement.lang = state.lang;
    const set = (id, key) => { const el=$(id); if(el) el.textContent=t(key); };
    set("modelStateTitle","modelTitle"); set("retryModelBtn","modelRetry"); set("headerStampLabel","headerStamp");
    set("introStamp","introStamp"); set("introEyebrow","introEyebrow"); set("playerNameLabel","playerLabel"); set("startBtn","start");
    $("playerName").placeholder=t("playerPlaceholder");
    set("dustEyebrow","dustEyebrow"); set("dustTitle","dustTitle"); set("dustHint","dustHint"); set("brushModeBtn","brush"); set("skipDustBtn","skip");
    qs("#navProfile b").textContent=t("navProfile"); set("navProfileHint","navProfileHint"); set("functionDockLabel","functionDockLabel"); qs("#navQa b").textContent=t("navQa"); set("navQaHint","navQaHint"); qs("#navWhatif b").textContent=t("navWhatif"); set("navWhatifHint","navWhatifHint"); qs("#navRoleplay b").textContent=t("navRoleplay"); set("navRoleplayHint","navRoleplayHint");
    set("profileEyebrow","profileEyebrow"); set("timelineHeading","timelineHeading"); set("timelineHint","timelineHint"); set("fullInfoHeading","fullInfoHeading"); set("fullInfoHint","fullInfoHint"); set("sourceReminderPrefix","sourceReminderPrefix"); set("sourceReminderBtn","sourceReminderButton");
    set("qaEyebrow","qaEyebrow"); set("qaHeading","qaHeading"); set("qaLead","qaLead"); $("qaInput").placeholder=t("qaPlaceholder"); set("qaSendBtn","qaSend"); set("qaMicBtn","mic");
    set("whatifEyebrow","whatifEyebrow"); set("whatifHeading","whatifHeading"); set("whatifLead","whatifLead"); $("whatifInput").placeholder=t("whatifPlaceholder"); set("whatifSendBtn","whatifSend"); set("whatifMicBtn","mic");
    set("roleplayEyebrow","roleplayEyebrow"); set("roleSimulationLabel","roleSimulation"); set("roleplayStartBtn","roleStart"); set("roleplayExportBtn","roleExport");
    set("sourcesEyebrow","sourcesEyebrow"); set("sourcesHeading","sourcesHeading"); set("sourcesLead","sourcesLead");
    set("guideEyebrow","guideEyebrow"); set("guideHeading","guideHeading"); $("guideList").innerHTML=t("guideHtml"); $("guideNote").innerHTML=t("guideNote");
    set("journeyEyebrow","journeyEyebrow"); set("journeyHeading","journeyHeading"); set("journeyFinishLabel","journeyFinish"); set("journeyFinishHint","journeyFinishHint");
    set("summaryEyebrow","summaryEyebrow"); set("summaryNote","summaryNote"); set("summaryPdfBtn","summaryPdf"); set("newSessionBtn","newSession");
    $("introLangBtn").textContent=state.lang==="vi"?"English":"Tiếng Việt"; $("langBtn").textContent=state.lang==="vi"?"EN":"VI";
    qsa(".panel-close").forEach(b=>b.setAttribute("aria-label",t("close")));
    const tools=qsa("#utilityRail .utility-btn");
    if(tools[0]) tools[0].title=t("toolGuide"); if(tools[1]) tools[1].title=t("toolSources"); if(tools[2]) tools[2].title=t("toolJourney");
    if($("resetCameraBtn")) $("resetCameraBtn").title=t("toolReset"); if($("audioBtn")) $("audioBtn").title=t("toolAudio"); if($("langBtn")) $("langBtn").title=t("toolLanguage"); if($("finishBtn")) $("finishBtn").title=t("toolFinish");
  }

  function playClick() {
    if (!state.audioEnabled) return;
    try {
      state.clickContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const ctx = state.clickContext;
      if (ctx.state === "suspended") ctx.resume().catch(()=>{});
      const now = ctx.currentTime;

      // Âm "tách" rất ngắn: một tiếng gõ trầm + lớp nhiễu giấy nhẹ.
      const osc = ctx.createOscillator();
      const toneGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.exponentialRampToValueAtTime(175, now + 0.055);
      toneGain.gain.setValueAtTime(0.075, now);
      toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(toneGain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);

      const length = Math.max(1, Math.floor(ctx.sampleRate * 0.045));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const src = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1450;
      filter.Q.value = 0.8;
      noiseGain.gain.setValueAtTime(0.035, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      src.buffer = buffer;
      src.connect(filter).connect(noiseGain).connect(ctx.destination);
      src.start(now);
    } catch (_) {}
  }
  document.addEventListener("click", e => { if (e.target.closest("button") && !e.target.closest("button").disabled) playClick(); resetIdleTimer(); }, true);
  ["keydown","pointerdown","touchstart"].forEach(evt => document.addEventListener(evt, resetIdleTimer, { passive:true }));

  async function loadProfile() {
    const response = await fetch(`./data/${encodeURIComponent(characterId)}.json`, { cache:"no-cache" });
    if (!response.ok) throw new Error(`Không tìm thấy hồ sơ ${characterId}.`);
    state.profile = await response.json();
    state.sourceMap = Object.fromEntries(state.profile.sources.map(s => [s.id, s]));
    renderProfile();
    configureAudio();
    loadModel();
  }

  function renderProfile() {
    const p = state.profile; if(!p) return;
    applyStaticLanguage();
    const name=displayName(p), dynasty=localValue(p,"dynasty"), period=localValue(p,"period"), stateName=localValue(p,"stateName"), capital=localValue(p,"capital"), regnal=localValue(p,"regnalName");
    document.title = `${state.lang==="en"?"Interactive History Museum":"Bảo tàng lịch sử tương tác"} — ${name}`;
    $("introName").textContent = name.toUpperCase();
    $("introText").textContent = p.intro?.[state.lang] || `${name} — ${period}`;
    $("introMeta").innerHTML = [p.years,dynasty,stateName,capital].filter(Boolean).map(v=>`<span>${escapeHtml(v)}</span>`).join("");
    $("identityName").textContent = name;
    $("identityPeriod").textContent = `${stateName || ""} • ${period || ""}`;
    $("profileTitle").textContent = `${name}${regnal?` — ${regnal}`:""}`;
    $("profileLead").textContent = `${p.years} • ${dynasty} • ${p.reign}. ${t("profileLead")}`;
    $("secretText").textContent = p.dustSecret?.[state.lang] || (state.lang==="en"?"Open the profile and examine the historical sources.":"Hãy mở hồ sơ để kiểm tra các nguồn sử liệu.");
    $("roleplayTitle").textContent = state.lang==="en" ? (p.roleplay?.titleEn || p.roleplay?.title || t("navRoleplay")) : (p.roleplay?.title || p.roleplay?.titleEn || t("navRoleplay"));
    $("roleplayContext").textContent = state.lang==="en" ? (p.roleplay?.contextEn || p.roleplay?.context || "") : (p.roleplay?.context || p.roleplay?.contextEn || "");
    const dims=state.lang==="en"?(p.roleplay?.dimensionsEn||p.roleplay?.dimensions||[]):(p.roleplay?.dimensions||p.roleplay?.dimensionsEn||[]);
    $("roleplayDimensions").innerHTML=dims.map(v=>`<span>${escapeHtml(v)}</span>`).join("");
    $("roleTurn").textContent=`${t("turn")} ${state.roleTurn||0} / ${p.roleplay?.maxTurns||6}`;

    const facts=[[t("factDate"),p.years],[t("factDynasty"),dynasty],[t("factReign"),p.reign],[t("factCapital"),capital]];
    $("profileFacts").innerHTML=facts.map(([a,b])=>`<div class="fact"><small>${escapeHtml(a)}</small><b>${escapeHtml(b||"—")}</b></div>`).join("");
    $("timeline").innerHTML=(p.timeline||[]).map(item=>`<div class="timeline-item"><div class="timeline-year">${escapeHtml(item.year)}</div><div class="timeline-text">${escapeHtml(state.lang==="en"?(item.textEn||item.text):(item.text||item.textEn))}${sourceChipsHtml(item.sourceIds)}</div></div>`).join("");
    $("profileSections").innerHTML=(p.profileSections||[]).map(sec=>`<article class="profile-section"><h3>${escapeHtml(state.lang==="en"?(sec.titleEn||sec.title):(sec.title||sec.titleEn))}</h3><p>${escapeHtml(state.lang==="en"?(sec.bodyEn||sec.body):(sec.body||sec.bodyEn))}</p>${sourceChipsHtml(sec.sourceIds)}</article>`).join("");
    $("sourcesList").innerHTML=(p.sources||[]).map(src=>`<article class="source-card" id="source-${escapeHtml(src.id)}"><h3>${escapeHtml(state.lang==="en"?(src.titleEn||src.title):(src.title||src.titleEn))}</h3><div class="source-org">${escapeHtml(state.lang==="en"?(src.organizationEn||src.organization):(src.organization||src.organizationEn))}</div><span class="source-type">${escapeHtml(state.lang==="en"?(src.typeEn||src.type):(src.type||src.typeEn))}</span><p>${escapeHtml(state.lang==="en"?(src.noteEn||src.note):(src.note||src.noteEn))}</p><a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${t("sourceOpen")}</a></article>`).join("");
    renderSuggestionButtons("qaSuggestions",state.lang==="en"?(p.qaSuggestionsEn||p.qaSuggestions||[]):(p.qaSuggestions||p.qaSuggestionsEn||[]),"qaInput");
    renderSuggestionButtons("whatifSuggestions",state.lang==="en"?(p.whatIfSuggestionsEn||p.whatIfSuggestions||[]):(p.whatIfSuggestions||p.whatIfSuggestionsEn||[]),"whatifInput");
    if(!$("qaResult").dataset.touched) $("qaResult").textContent=t("qaEmpty");
    if(!$("whatifResult").dataset.touched) $("whatifResult").textContent=t("whatifEmpty");
    if(!$("roleplayResult").dataset.touched) $("roleplayResult").textContent=t("roleEmpty");
    renderJourney(); bindSourceChips();
    if(state.activePanel==="summaryPanel") buildSummary();
  }

  function sourceChipsHtml(ids = []) {
    return `<div class="source-chips">${ids.map(id => {
      const s = state.sourceMap[id];
      return s ? `<button class="source-chip" data-source-id="${escapeHtml(id)}" type="button">${escapeHtml(state.lang==="en"?(s.organizationEn||s.organization):(s.organization||s.organizationEn))}</button>` : "";
    }).join("")}</div>`;
  }
  function bindSourceChips(root = document) {
    qsa("[data-source-id]", root).forEach(btn => {
      if (btn.dataset.bound) return; btn.dataset.bound = "1";
      btn.addEventListener("click", () => openSourcesAt(btn.dataset.sourceId));
    });
  }
  function openSourcesAt(id) {
    openPanel("sourcesPanel");
    setTimeout(() => $("source-" + id)?.scrollIntoView({ behavior:"smooth", block:"center" }), 80);
  }
  function renderSuggestionButtons(containerId, items = [], inputId) {
    const box = $(containerId); box.innerHTML = "";
    items.forEach(text => {
      const b = document.createElement("button"); b.type="button"; b.className="chip"; b.textContent=text;
      b.addEventListener("click", () => { $(inputId).value = text; $(inputId).focus(); }); box.appendChild(b);
    });
  }

  function configureAudio() {
    const p = state.profile;
    $("narrationVi").src = p.narration?.vi || "";
    $("narrationEn").src = p.narration?.en || "";
    $("narrationVi").volume = 1; $("narrationEn").volume = 1;
  }
  function activeNarration() { return state.lang === "en" ? $("narrationEn") : $("narrationVi"); }
  function otherNarration() { return state.lang === "en" ? $("narrationVi") : $("narrationEn"); }
  function pauseNarration() {
    const a = activeNarration();
    // Không ghi đè trạng thái cần tiếp tục khi chuyển qua nhiều panel liên tiếp
    // (ví dụ Hồ sơ -> Kiểm chứng). Chỉ nâng cờ lên true khi âm thanh thực sự đang phát.
    if (!a.paused && !a.ended) state.narrationWasPlaying = true;
    a.pause();
  }
  function resumeNarration(force = false) {
    if (!state.audioEnabled || !state.mainStarted || state.activePanel) return;
    const a = activeNarration();
    const shouldResume = force || state.narrationWasPlaying || a.currentTime === 0;
    if (!shouldResume) return;
    a.play().then(()=>{ state.narrationWasPlaying = false; }).catch(()=>{});
  }
  function stopTts() {
    if (state.currentTts) { state.currentTts.pause(); state.currentTts.src = ""; state.currentTts = null; }
    if (state.ttsUrl) { URL.revokeObjectURL(state.ttsUrl); state.ttsUrl = null; }
  }
  async function speak(text) {
    if (!state.audioEnabled || !text || !state.online) return;
    stopTts();
    try {
      const r = await fetch(`${apiBase}/speak`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text, lang:state.lang }) });
      if (!r.ok) return;
      const blob = await r.blob(); state.ttsUrl = URL.createObjectURL(blob); state.currentTts = new Audio(state.ttsUrl); state.currentTts.volume = 1;
      await state.currentTts.play().catch(()=>{});
    } catch (_) {}
  }

  async function loadModel(force = false) {
    const box = $("modelState"), text = $("modelStateText"), retry = $("retryModelBtn"), model = $("historyModel");
    box.classList.remove("hidden"); retry.classList.add("hidden"); text.textContent = t("modelLoading");
    try { await customElements.whenDefined("model-viewer"); } catch (_) {}
    const src = state.profile.model;
    const finalSrc = force ? `${src}${src.includes("?")?"&":"?"}v=${Date.now()}` : src;
    model.src = finalSrc;
    model.addEventListener("load", () => { box.classList.add("hidden"); model.cameraOrbit="0deg 75deg 105%"; model.jumpCameraToGoal?.(); }, { once:true });
    model.addEventListener("error", () => { text.textContent=t("modelError"); retry.classList.remove("hidden"); }, { once:true });
  }

  function openPanel(id) {
    if (state.activePanel === id) return closePanels();
    closePanels(false);
    state.activePanel = id; pauseNarration(); stopTts();
    $(id).classList.remove("hidden"); $("panelBackdrop").classList.remove("hidden");
    qsa(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.panel === id));
    if (id === "profilePanel") markJourney("profile");
  }
  function closePanels(resume = true) {
    qsa(".panel").forEach(p => p.classList.add("hidden")); $("panelBackdrop").classList.add("hidden");
    qsa(".nav-btn").forEach(b => b.classList.remove("active")); state.activePanel = null; stopTts();
    if (resume) setTimeout(() => resumeNarration(), 40);
  }

  function markJourney(key) { if (!state.journey[key]) { state.journey[key]=true; renderJourney(); } }
  function renderJourney() {
    const items=[["observe",t("journeyObserve")],["profile",t("journeyProfile")],["qa",t("journeyQa")],["whatif",t("journeyWhatif")],["roleplay",t("journeyRoleplay")]];
    $("journeyList").innerHTML=items.map(([k,label])=>`<div class="journey-item ${state.journey[k]?"done":""}"><span class="journey-dot">${state.journey[k]?"✓":"○"}</span><span>${escapeHtml(label)}</span></div>`).join("");
  }

  function resetIdleTimer() {
    if (!CFG.ENABLE_KIOSK_RESET || !state.mainStarted) return;
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => {
      sendSessionSummary("kiosk-timeout").finally(() => location.reload());
    }, Number(CFG.KIOSK_IDLE_MS || 180000));
  }

  async function checkHealth() {
    const badge = $("connectionBadge"); badge.textContent=t("checking"); badge.className="status-badge checking";
    try {
      const r = await fetch(`${apiBase}/health`, { cache:"no-store" }); const data = await r.json();
      state.online = Boolean(r.ok && data.ok && data.aiReady); badge.textContent=state.online?t("online"):t("offline"); badge.className=`status-badge ${state.online?"online":"offline"}`;
    } catch (_) { state.online=false; badge.textContent=t("offline"); badge.className="status-badge offline"; }
  }

  async function apiPost(path, payload) {
    const r = await fetch(`${apiBase}${path}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(Object.assign({ characterId:state.profile.id, lang:state.lang }, payload)) });
    let data={}; try{data=await r.json();}catch(_){}
    if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`); return data;
  }

  async function saveReport(type, history, metadata = {}, eventType="interaction") {
    try {
      await apiPost("/save-report", { eventType, sessionId:state.sessionId, playerName:state.playerName, type, history, metadata });
    } catch (e) { console.warn("Không lưu được báo cáo", e); }
  }

  function renderSources(ids = []) {
    if (!ids.length) return `<p class="muted">${escapeHtml(t("noDirectSource"))}</p>`;
    return sourceChipsHtml(ids);
  }

  async function askQuestion() {
    const input=$("qaInput"), q=input.value.trim(); if(!q)return;
    const send=$("qaSendBtn"); send.disabled=true; $("qaStatus").textContent=t("connecting"); $("qaResult").className="result-card"; $("qaResult").textContent="…";
    try {
      const data=await apiPost("/ask",{question:q}); state.qaCount++; state.questions.push(q); markJourney("qa"); $("qaResult").dataset.touched="1";
      const uncertain=/kiểm chứng|verification/i.test(data.answerType||"");
      $("qaResult").innerHTML=`<span class="type-badge ${uncertain?"uncertain":""}">${escapeHtml(data.answerType)}</span><p>${escapeHtml(data.reply)}</p><h3>${t("evidence")}</h3><div class="evidence-list">${(data.evidencePoints||[]).map(x=>`<div class="evidence-item">${escapeHtml(x)}</div>`).join("")}</div><h3>${t("source")}</h3>${renderSources(data.sourceIds)}<h3>${t("evidenceNote")}</h3><p>${escapeHtml(data.evidenceNote)}</p><p><b>${t("confidence")}:</b> ${escapeHtml(data.confidence)}</p>`;
      bindSourceChips($("qaResult")); renderSuggestionButtons("qaSuggestions",data.suggestions||[],"qaInput"); $("qaStatus").textContent=t("complete");
      await saveReport("Tra cứu sử liệu",[{role:"user",content:q},{role:"assistant",content:JSON.stringify(data)}],{durationSeconds:0,sourceIds:data.sourceIds});
      speak(data.reply);
    } catch(e){$("qaStatus").textContent=t("networkFail");$("qaResult").textContent=e.message||t("networkFail");}
    finally{send.disabled=false;}
  }

  async function runWhatIf() {
    const input=$("whatifInput"), scenario=input.value.trim(); if(!scenario)return;
    const send=$("whatifSendBtn"); send.disabled=true; $("whatifStatus").textContent=t("analyzing"); $("whatifResult").className="result-card"; $("whatifResult").textContent="…";
    try{
      const data=await apiPost("/whatif",{scenario,history:state.whatifHistory.slice(-8)}); state.whatifCount++; state.questions.push(scenario); markJourney("whatif"); $("whatifResult").dataset.touched="1";
      state.whatifHistory.push({role:"user",content:scenario},{role:"assistant",content:JSON.stringify(data)});
      $("whatifResult").innerHTML=`<h3>${t("baseline")}</h3><p>${escapeHtml(data.baseline)}</p>${renderSources(data.sourceIds)}<h3>${t("changed")}</h3><p>${escapeHtml(data.changedAssumption)}</p><h3>${t("consequences")}</h3><ol>${(data.consequences||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ol><h3>${t("uncertainty")}</h3><p>${escapeHtml(data.uncertainty)}</p><h3>${t("method")}</h3><p>${escapeHtml(data.methodNote)}</p><div class="fact-strip"><div class="fact"><small>${t("feasibility")}</small><b>${escapeHtml(data.impact?.feasibility)}</b></div><div class="fact"><small>${t("historicalRisk")}</small><b>${escapeHtml(data.impact?.historicalRisk)}</b></div><div class="fact"><small>${t("uncertaintyShort")}</small><b>${escapeHtml(data.impact?.uncertainty)}</b></div></div>`;
      bindSourceChips($("whatifResult")); renderSuggestionButtons("whatifSuggestions",data.suggestions||[],"whatifInput"); $("whatifStatus").textContent=t("complete");
      await saveReport("Giả định lịch sử",[{role:"user",content:scenario},{role:"assistant",content:JSON.stringify(data)}],{sourceIds:data.sourceIds});
      speak(`${data.baseline}. ${data.consequences.join(". ")}. ${data.uncertainty}`);
    }catch(e){$("whatifStatus").textContent=t("networkFail");$("whatifResult").textContent=e.message||t("networkFail");}
    finally{send.disabled=false;}
  }

  async function startRoleplay() {
    state.roleHistory=[];state.roleTurn=1;state.roleStartedAt=Date.now();state.roleplayCount++;$("roleplayStartBtn").classList.add("hidden");$("roleplayExportBtn").classList.add("hidden");await nextRoleplayTurn();
  }
  async function nextRoleplayTurn(choice="") {
    $("roleplayStatus").textContent=t("role");$("roleplayChoices").innerHTML="";$("roleplayResult").className="result-card";$("roleplayResult").textContent="…";
    if(choice)state.roleHistory.push({role:"user",content:choice});
    try{
      const data=await apiPost("/roleplay",{history:state.roleHistory.slice(-16),turn:state.roleTurn}); state.roleHistory.push({role:"assistant",content:JSON.stringify(data)});
      $("roleTurn").textContent=`${t("turn")} ${state.roleTurn} / ${state.profile.roleplay?.maxTurns||6}`;
      $("roleplayResult").dataset.touched="1";
      $("roleplayResult").innerHTML=`${data.feedback?`<h3>${t("feedback")}</h3><p>${escapeHtml(data.feedback)}</p>`:""}<h3>${t("situation")}</h3><p>${escapeHtml(data.npcDialogue)}</p><h3>${t("dimension")}</h3><div class="evidence-list"><div class="evidence-item"><b>${t("military")}:</b> ${escapeHtml(data.dimensionReview?.military)}</div><div class="evidence-item"><b>${t("diplomacy")}:</b> ${escapeHtml(data.dimensionReview?.diplomacy)}</div><div class="evidence-item"><b>${t("publicSupport")}:</b> ${escapeHtml(data.dimensionReview?.publicSupport)}</div><div class="evidence-item"><b>${t("logistics")}:</b> ${escapeHtml(data.dimensionReview?.logistics)}</div></div><h3>${t("contextSources")}</h3>${renderSources(data.sourceIds)}${data.isGameOver?`<h3>${t("conclusion")}</h3><p>${escapeHtml(data.endReason)}</p>`:""}`;
      bindSourceChips($("roleplayResult")); $("roleplayStatus").textContent=t("complete"); speak(data.npcDialogue);
      if(data.isGameOver||state.roleTurn>=Number(state.profile.roleplay?.maxTurns||6)){
        markJourney("roleplay");$("roleplayExportBtn").classList.remove("hidden");
        await saveReport("Nhập vai quyết sách",state.roleHistory,{turns:state.roleTurn,durationSeconds:Math.round((Date.now()-state.roleStartedAt)/1000),sourceIds:data.sourceIds});
      }else{
        (data.choices||[]).forEach(choiceText=>{const b=document.createElement("button");b.type="button";b.className="ink-btn choice-btn";b.textContent=choiceText;b.addEventListener("click",async()=>{qsa(".choice-btn").forEach(x=>x.disabled=true);state.roleTurn++;await nextRoleplayTurn(choiceText);});$("roleplayChoices").appendChild(b);});
      }
    }catch(e){$("roleplayStatus").textContent=t("networkFail");$("roleplayResult").textContent=e.message||t("networkFail");$("roleplayStartBtn").classList.remove("hidden");}
  }

  function exportRoleplay() {
    const content=document.createElement("div"),name=displayName(state.profile); content.style.padding="28px";
    content.innerHTML=`<h2>${escapeHtml(t("worksheet"))} — ${escapeHtml(name)}</h2><p><b>${t("learner")}:</b> ${escapeHtml(state.playerName)}</p><hr>${state.roleHistory.map(item=>`<p><b>${item.role==="user"?t("decision"):t("response")}:</b> ${escapeHtml(item.content)}</p>`).join("")}`;
    if(window.html2pdf)window.html2pdf().set({margin:.5,filename:`${state.lang==="en"?"Learning_Worksheet":"Phieu_hoc_tap"}_${state.profile.id}.pdf`,html2canvas:{scale:2},jsPDF:{unit:"in",format:"a4",orientation:"portrait"}}).from(content).save();else window.print();
  }

  function buildSummary() {
    const elapsed=(Date.now()-state.sessionStartedAt)/1000,name=displayName(state.profile),locale=state.lang==="en"?"en-US":"vi-VN";
    $("summaryTitle").textContent=`${t("summaryTitle")} — ${name}`;
    $("summarySubtitle").textContent=`${state.playerName} • ${new Date().toLocaleString(locale)}`;
    $("summaryStats").innerHTML=`<div class="summary-card"><small>${t("time")}</small><b>${formatDuration(elapsed)}</b></div><div class="summary-card"><small>${t("inquiry")}</small><b>${state.qaCount} ${t("uses")}</b></div><div class="summary-card"><small>${t("counterfactual")}</small><b>${state.whatifCount} ${t("uses")}</b></div><div class="summary-card"><small>${t("roleplayCount")}</small><b>${state.roleplayCount} ${t("sessions")}</b></div>`;
    const labels={observe:t("journeyObserve"),profile:t("journeyProfile"),qa:t("journeyQa"),whatif:t("journeyWhatif"),roleplay:t("journeyRoleplay")};
    $("summaryJourney").innerHTML=Object.entries(labels).map(([k,v])=>`<div class="journey-item ${state.journey[k]?"done":""}"><span class="journey-dot">${state.journey[k]?"✓":"○"}</span>${escapeHtml(v)}</div>`).join("")+(state.questions.length?`<div class="note-box"><b>${t("latestContent")}:</b> ${escapeHtml(state.questions.at(-1))}</div>`:"");
  }
  async function sendSessionSummary(reason="user-finish") {
    if(!state.sessionStartedAt || state.sessionSummarySent)return;
    state.sessionSummarySent = true;
    await saveReport("Tổng kết phiên",[],{
      reason,durationSeconds:Math.max(1,Math.round((Date.now()-state.sessionStartedAt)/1000)),qaCount:state.qaCount,whatifCount:state.whatifCount,roleplayCount:state.roleplayCount,journey:state.journey,questions:state.questions.slice(-10)
    },"session_summary");
  }
  async function finishSession(){buildSummary();await sendSessionSummary("user-finish");openPanel("summaryPanel");}

  function setupMic(buttonId,inputId){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition,btn=$(buttonId),input=$(inputId);if(!SR){btn.addEventListener("click",()=>toast(t("noSpeech")));return;}
    btn.addEventListener("click",()=>{
      if(state.speechRecognition){state.speechRecognition.stop();return;}
      const rec=new SR();state.speechRecognition=rec;rec.lang=state.lang==="en"?"en-US":"vi-VN";rec.interimResults=true;rec.continuous=false;btn.textContent=t("micStop");
      rec.onresult=e=>{let out="";for(let i=e.resultIndex;i<e.results.length;i++)out+=e.results[i][0].transcript;input.value=out;};
      rec.onend=()=>{state.speechRecognition=null;btn.textContent=t("mic");};rec.onerror=()=>{state.speechRecognition=null;btn.textContent=t("mic");};try{rec.start();}catch(_){state.speechRecognition=null;}
    });
  }

  function resetLanguageSensitiveViews(){
    stopTts();
    state.whatifHistory=[]; state.roleHistory=[]; state.roleTurn=0;
    [["qaResult","qaEmpty"],["whatifResult","whatifEmpty"],["roleplayResult","roleEmpty"]].forEach(([id,key])=>{const el=$(id);el.dataset.touched="";el.className="result-card empty";el.textContent=t(key);});
    $("qaStatus").textContent=""; $("whatifStatus").textContent=""; $("roleplayStatus").textContent=""; $("roleplayChoices").innerHTML="";
    $("roleplayStartBtn").classList.remove("hidden"); $("roleplayExportBtn").classList.add("hidden");
    if(state.profile) $("roleTurn").textContent=`${t("turn")} 0 / ${state.profile.roleplay?.maxTurns||6}`;
  }

  function toggleLanguage(){
    pauseNarration(); otherNarration().pause();
    state.lang=state.lang==="vi"?"en":"vi";
    if(state.mainStarted) activeNarration().currentTime=0;
    resetLanguageSensitiveViews();
    renderProfile();
    checkHealth();
    toast(t("languageReset"),3000);
    if(state.mainStarted && !state.activePanel) resumeNarration(true);
  }
  function toggleAudio(){
    state.audioEnabled=!state.audioEnabled;$("audioBtn").textContent=state.audioEnabled?"🔊":"🔇";
    if(!state.audioEnabled){$("narrationVi").pause();$("narrationEn").pause();stopTts();}else if(!state.activePanel)resumeNarration(true);
  }

  function startExperience(){
    state.playerName=$("playerName").value.trim()||t("defaultLearner");localStorage.setItem("history-player-name",state.playerName);state.sessionStartedAt=Date.now();$("introScreen").classList.add("hidden");$("dustScreen").classList.remove("hidden");initDust();
  }
  function startMain(){
    if(state.mainStarted)return;state.mainStarted=true;state.journey.observe=true;renderJourney();$("dustScreen").classList.add("hidden");$("appHeader").classList.remove("hidden");$("mainNav").classList.remove("hidden");$("utilityRail").classList.remove("hidden");resumeNarration(true);checkHealth();resetIdleTimer();
  }

  function initDust(){
    const canvas=$("dustCanvas"),ctx=canvas.getContext("2d",{willReadFrequently:true}),card=qs(".dust-card"),instruction=$("dustInstruction");
    state.dust.instructionHidden=false;
    instruction.classList.remove("is-fading");
    const hideInstruction=()=>{if(state.dust.instructionHidden)return;state.dust.instructionHidden=true;instruction.classList.add("is-fading");};
    const resize=()=>{const rect=card.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);canvas.style.width=rect.width+"px";canvas.style.height=rect.height+"px";ctx.setTransform(dpr,0,0,dpr,0,0);drawDust(ctx,rect.width,rect.height);};resize();
    function erase(clientX,clientY,r=52){hideInstruction();const rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;ctx.save();ctx.globalCompositeOperation="destination-out";const g=ctx.createRadialGradient(x,y,8,x,y,r);g.addColorStop(0,"rgba(0,0,0,1)");g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();state.dust.eraseEvents++;if(state.dust.eraseEvents%8===0)measure();}
    function randomErase(intensity=1){const rect=canvas.getBoundingClientRect();erase(rect.left+rect.width*(.15+Math.random()*.7),rect.top+rect.height*(.18+Math.random()*.62),45+intensity*25);}
    function measure(){const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let clear=0,total=0;const step=Math.max(4,Math.round(12*(devicePixelRatio||1)));for(let y=0;y<canvas.height;y+=step){for(let x=0;x<canvas.width;x+=step){total++;if(data[(y*canvas.width+x)*4+3]<100)clear++;}}const pct=Math.min(100,Math.round(clear/total*100));$("dustProgressBar").style.width=pct+"%";$("dustProgressText").textContent=pct+"%";if(pct>=52)reveal();}
    function reveal(){if(state.dust.revealed)return;state.dust.revealed=true;hideInstruction();state.dust.stream?.getTracks().forEach(t=>t.stop());cancelAnimationFrame(state.dust.raf);canvas.style.transition="opacity .8s";canvas.style.opacity="0";$("dustProgressBar").style.width="100%";$("dustProgressText").textContent="100%";setTimeout(startMain,1300);}
    state.dust.reveal=reveal;
    const pos=e=>({x:e.clientX,y:e.clientY});
    canvas.addEventListener("pointerdown",e=>{state.dust.drawing=true;canvas.setPointerCapture(e.pointerId);const p=pos(e);erase(p.x,p.y,60);});
    canvas.addEventListener("pointermove",e=>{if(!state.dust.drawing)return;const p=pos(e);erase(p.x,p.y,48);});
    canvas.addEventListener("pointerup",()=>state.dust.drawing=false);canvas.addEventListener("pointercancel",()=>state.dust.drawing=false);
    navigator.mediaDevices?.getUserMedia({audio:true}).then(stream=>{
      state.dust.stream=stream;const ac=new (window.AudioContext||window.webkitAudioContext)(),an=ac.createAnalyser(),src=ac.createMediaStreamSource(stream);src.connect(an);an.fftSize=256;const arr=new Uint8Array(an.frequencyBinCount);let baseline=0,samples=0,last=0;
      const loop=()=>{if(state.dust.revealed)return;an.getByteFrequencyData(arr);const avg=arr.reduce((a,b)=>a+b,0)/arr.length;if(samples<35){baseline+=avg;samples++;}else{const base=baseline/samples;if(avg>base+18){hideInstruction();if(performance.now()-last>95){randomErase(Math.min(2,(avg-base)/35));last=performance.now();}}}state.dust.raf=requestAnimationFrame(loop);};loop();
    }).catch(()=>toast(t("micUnavailable")));
  }
  function drawDust(ctx,w,h){ctx.globalCompositeOperation="source-over";ctx.clearRect(0,0,w,h);ctx.fillStyle="#665544";ctx.fillRect(0,0,w,h);for(let i=0;i<950;i++){const a=.04+Math.random()*.13,r=.4+Math.random()*3;ctx.fillStyle=`rgba(${85+Math.random()*55},${70+Math.random()*40},${52+Math.random()*30},${a})`;ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,r,0,Math.PI*2);ctx.fill();}}

  function resetCamera(){const m=$("historyModel");m.cameraOrbit="0deg 75deg 105%";m.cameraTarget="auto auto auto";m.fieldOfView="auto";m.jumpCameraToGoal?.();}

  function bindEvents(){
    $("startBtn").addEventListener("click",startExperience);$("playerName").addEventListener("keydown",e=>{if(e.key==="Enter")startExperience();});
    $("introLangBtn").addEventListener("click",toggleLanguage);$("langBtn").addEventListener("click",toggleLanguage);$("audioBtn").addEventListener("click",toggleAudio);
    $("retryModelBtn").addEventListener("click",()=>loadModel(true));$("resetCameraBtn").addEventListener("click",resetCamera);
    qsa("[data-panel]").forEach(b=>b.addEventListener("click",()=>openPanel(b.dataset.panel)));qsa(".panel-close").forEach(b=>b.addEventListener("click",()=>closePanels()));$("panelBackdrop").addEventListener("click",()=>closePanels());
    qsa("[data-open]").forEach(b=>b.addEventListener("click",()=>openPanel(b.dataset.open)));
    $("qaSendBtn").addEventListener("click",askQuestion);$("qaInput").addEventListener("keydown",e=>{if(e.key==="Enter")askQuestion();});
    $("whatifSendBtn").addEventListener("click",runWhatIf);$("whatifInput").addEventListener("keydown",e=>{if(e.key==="Enter")runWhatIf();});
    $("roleplayStartBtn").addEventListener("click",startRoleplay);$("roleplayExportBtn").addEventListener("click",exportRoleplay);
    $("finishBtn").addEventListener("click",finishSession);$("journeyFinishBtn").addEventListener("click",finishSession);$("newSessionBtn").addEventListener("click",()=>location.reload());
    $("summaryPdfBtn").addEventListener("click",()=>{if(window.html2pdf)window.html2pdf().set({margin:.4,filename:`${state.lang==="en"?"Journey_Summary":"Tong_ket"}_${state.profile.id}.pdf`,html2canvas:{scale:2},jsPDF:{unit:"in",format:"a4",orientation:"portrait"}}).from($("summaryPrintable")).save();else window.print();});
    $("skipDustBtn").addEventListener("click",()=>state.dust.reveal?.());$("brushModeBtn").addEventListener("click",()=>toast(t("brushReady")));
    setupMic("qaMicBtn","qaInput");setupMic("whatifMicBtn","whatifInput");
    document.addEventListener("visibilitychange",()=>{if(document.hidden){pauseNarration();stopTts();}else if(!state.activePanel)resumeNarration();});
  }

  async function boot(){
    bindEvents();applyStaticLanguage();$("playerName").value=localStorage.getItem("history-player-name")||"";
    try{await loadProfile();}catch(e){$("introText").textContent=e.message;$("startBtn").disabled=true;$("modelStateText").textContent=e.message;$("retryModelBtn").classList.remove("hidden");}
    checkHealth();
  }
  boot();
})();
