/* =========================================================
   WAREHOUSE MANAGEMENT SYSTEM — SIGN IN / ONBOARDING LOGIC
   Standalone page script (no backend). Mirrors the toast /
   interaction patterns used in the dashboard's script.js.
   ========================================================= */
  


(function () {
  "use strict";
  const auth = firebase.auth();

  /* ---------------------------------------------------------
     0. DUMMY DATA (no backend)
     --------------------------------------------------------- */
  // Phone numbers treated as "already existing users"
  //const EXISTING_PHONES = ["9876543210", "9123456780", "9000011111"];

  // Tamil Nadu district -> state/country mapping (demo dataset)
  const DISTRICTS = [
    "Chennai", "Coimbatore", "Cuddalore", "Chengalpattu", "Krishnagiri",
    "Kanchipuram", "Kanyakumari", "Karur", "Madurai", "Mayiladuthurai",
    "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
    "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi",
    "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
    "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
    "Vellore", "Viluppuram", "Virudhunagar", "Ariyalur", "Dharmapuri", "Dindigul", "Erode"
  ];
  const DISTRICT_STATE = "Tamil Nadu";
  const DISTRICT_COUNTRY = "India";

  const state = {
    username: "", dob: "", countryCode: "+91", countryFlag: "🇮🇳", phone: "",
    phoneVerified: false,
    street: "", landmark: "", district: "", pincode: "", addrState: "", addrCountry: "",
    password: ""
  };

  let otp = "0000";
  let otpTimerId = null;
  let otpSecondsLeft = 30;

  /* ---------------------------------------------------------
     1. UTILITIES
     --------------------------------------------------------- */
  function $(id) { return document.getElementById(id); }

  let toastTimer = null;
  function showToast(message, icon) {
    const toast = $("toast");
    toast.innerHTML = `<i class="fa-solid ${icon || "fa-circle-check"}"></i><span>${message}</span>`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function setError(fieldId, message) {
    const el = $("err-" + fieldId);
    const input = $(fieldId);
    if (el) el.textContent = message || "";
    if (input) input.classList.toggle("invalid", !!message);
  }

  function clearErrors(ids) { ids.forEach((id) => setError(id, "")); }

  function startLiveClock() {
    function tick() {
      const now = new Date();
      const dateEl = $("liveDateText");
      const timeEl = $("liveTimeText");
      if (dateEl) dateEl.textContent = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      if (timeEl) timeEl.textContent = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------
     2. STEPPER / SECTION NAVIGATION
     --------------------------------------------------------- */
  const SECTIONS = ["section-account", "section-address", "section-password"];

  function goToSection(index) {
    SECTIONS.forEach((id, i) => {
      $(id).classList.toggle("active", i === index);
    });
    document.querySelectorAll(".step").forEach((stepEl, i) => {
      stepEl.classList.toggle("active", i === index);
      stepEl.classList.toggle("done", i < index);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------------------------------------------------
     3. SECTION 1 — USER INFO
     --------------------------------------------------------- */
  function wireCountrySelect() {
    const trigger = $("countryTrigger");
    const dropdown = $("countryDropdown");
    trigger.addEventListener("click", () => dropdown.classList.toggle("open"));
    document.addEventListener("click", (e) => {
      if (!$("countrySelect").contains(e.target)) dropdown.classList.remove("open");
    });
    dropdown.querySelectorAll(".country-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        state.countryFlag = opt.dataset.flag;
        state.countryCode = opt.dataset.code;
        $("countryFlag").textContent = state.countryFlag;
        $("countryCode").textContent = state.countryCode;
        dropdown.classList.remove("open");
      });
    });
  }

  function validateUsername() {
    const val = $("fUsername").value.trim();
    if (!val) { setError("fUsername", "Username is required."); return false; }
    if (val.length < 3) { setError("fUsername", "Username must be at least 3 characters."); return false; }
    setError("fUsername", "");
    return true;
  }

  function validateDob() {
    const val = $("fDob").value;
    if (!val) { setError("fDob", "Date of birth is required."); return false; }
    const age = (new Date() - new Date(val)) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 16) { setError("fDob", "You must be at least 16 years old."); return false; }
    setError("fDob", "");
    return true;
  }

  function validatePhoneFormat() {
    const val = $("fPhone").value.trim();
    if (!/^\d{7,12}$/.test(val)) { setError("fPhone", "Enter a valid phone number."); return false; }
    setError("fPhone", "");
    return true;
  }

  function wireVerifyButton() {
    $("verifyBtn").addEventListener("click", () => {
      clearErrors(["fPhone"]);
      $("userStatusMsg").textContent = "";
      $("userStatusMsg").className = "user-status-msg";

      if (!validatePhoneFormat()) return;
      const phoneDigits = $("fPhone").value.trim();

      

      const phoneNumber = state.countryCode + phoneDigits;

auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
.then((confirmationResult) => {

    window.confirmationResult = confirmationResult;

    showToast("OTP Sent Successfully!");

    openOtpModal(phoneNumber);

})
.catch((error) => {

    console.error("Firebase Error:", error);
    alert(error.code + "\n\n" + error.message);

});

});
    }

  function wireNextFromAccount() {
    $("toAddressBtn").addEventListener("click", () => {
      const okU = validateUsername();
      const okD = validateDob();
      const okP = validatePhoneFormat();

      if (!okU || !okD || !okP) { showToast("Please fix the errors above.", "fa-triangle-exclamation"); return; }
      if (!state.phoneVerified) { showToast("Please verify your phone number.", "fa-triangle-exclamation"); return; }

      state.username = $("fUsername").value.trim();
      state.dob = $("fDob").value;
      state.phone = $("fPhone").value.trim();

      goToSection(1);
    });
  }

  /* ---------------------------------------------------------
     4. OTP MODAL
     --------------------------------------------------------- */
  function openOtpModal(phoneDisplay) {
    $("otpPhoneDisplay").textContent = phoneDisplay;
    $("otpOverlay").classList.add("open");
    document.querySelectorAll(".otp-box").forEach((b) => (b.value = ""));
    setError("otp", "");
    $("otpBoxes").querySelector('[data-idx="0"]').focus();
    startOtpTimer();
  }

  function closeOtpModal() {
    $("otpOverlay").classList.remove("open");
    clearInterval(otpTimerId);
  }

  function startOtpTimer() {
    clearInterval(otpTimerId);
    otpSecondsLeft = 30;
    $("resendOtpBtn").disabled = true;
    renderTimer();
    otpTimerId = setInterval(() => {
      otpSecondsLeft--;
      renderTimer();
      if (otpSecondsLeft <= 0) {
        clearInterval(otpTimerId);
        $("resendOtpBtn").disabled = false;
      }
    }, 1000);
  }

  function renderTimer() {
    const m = String(Math.floor(otpSecondsLeft / 60)).padStart(2, "0");
    const s = String(otpSecondsLeft % 60).padStart(2, "0");
    $("otpTimer").textContent = `${m}:${s}`;
  }

  function wireOtpBoxes() {
    const boxes = Array.from(document.querySelectorAll(".otp-box"));
    boxes.forEach((box, i) => {
      box.addEventListener("input", () => {
        box.value = box.value.replace(/\D/g, "").slice(0, 1);
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
      });
      box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !box.value && i > 0) boxes[i - 1].focus();
      });
      box.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6).split("");
        text.forEach((ch, idx) => { if (boxes[idx]) boxes[idx].value = ch; });
        const next = boxes[Math.min(text.length, boxes.length - 1)];
        if (next) next.focus();
      });
    });
  }

  function wireOtpActions() {
    $("otpClose").addEventListener("click", closeOtpModal);
    $("otpOverlay").addEventListener("click", (e) => { if (e.target.id === "otpOverlay") closeOtpModal(); });

    $("resendOtpBtn").addEventListener("click", () => {
      
      document.querySelectorAll(".otp-box").forEach((b) => (b.value = ""));
      $("otpBoxes").querySelector('[data-idx="0"]').focus();
      startOtpTimer();
      showToast("A new OTP has been sent.", "fa-paper-plane");
    });

    $("otpSubmitBtn").addEventListener("click", () => {
      const boxes = Array.from(document.querySelectorAll(".otp-box"));
      const entered = boxes.map((b) => b.value).join("");
      if (entered.length < 6) { setError("otp", "Enter all 6 digits."); return; }
      window.confirmationResult.confirm(entered)

.then((result) => {

    setError("otp", "");

    closeOtpModal();

    state.phoneVerified = true;

    const vBtn = $("verifyBtn");

    vBtn.textContent = "Verified ✓";

    vBtn.classList.add("verified");

    vBtn.disabled = true;

    showToast("Phone number verified successfully.", "fa-circle-check");

})

.catch((error) => {

    console.error(error);

    setError("otp", "Invalid OTP.");

});
    });
  }

  /* ---------------------------------------------------------
     5. SECTION 2 — ADDRESS
     --------------------------------------------------------- */
  function wireDistrictAutocomplete() {
    const input = $("fDistrict");
    const list = $("districtList");

    function render(items) {
      if (!items.length) {
        list.innerHTML = `<div class="autocomplete-empty">No matching districts</div>`;
        list.classList.add("open");
        return;
      }
      list.innerHTML = items.map((d) => `<div class="autocomplete-item">${d}</div>`).join("");
      list.classList.add("open");
      list.querySelectorAll(".autocomplete-item").forEach((el) => {
        el.addEventListener("click", () => {
          input.value = el.textContent;
          $("fState").value = DISTRICT_STATE;
          $("fCountry").value = DISTRICT_COUNTRY;
          list.classList.remove("open");
          setError("fDistrict", "");
        });
      });
    }

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      $("fState").value = "";
      $("fCountry").value = "";
      if (!q) { list.classList.remove("open"); return; }
      const matches = DISTRICTS.filter((d) => d.toLowerCase().startsWith(q));
      render(matches);
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".autocomplete-wrap")) list.classList.remove("open");
    });
  }

  function validateAddressFields() {
    let ok = true;
    if (!$("fStreet").value.trim()) { setError("fStreet", "Street address is required."); ok = false; } else setError("fStreet", "");
    if (!$("fLandmark").value.trim()) { setError("fLandmark", "Landmark is required."); ok = false; } else setError("fLandmark", "");
    if (!$("fDistrict").value.trim() || !$("fState").value) { setError("fDistrict", "Select a valid district from the list."); ok = false; } else setError("fDistrict", "");
    if (!/^\d{6}$/.test($("fPincode").value.trim())) { setError("fPincode", "Enter a valid 6-digit pincode."); ok = false; } else setError("fPincode", "");
    return ok;
  }

  function wireAddressActions() {
    $("addrPrevBtn").addEventListener("click", () => goToSection(0));

    $("saveAddressBtn").addEventListener("click", () => {
      if (!validateAddressFields()) { showToast("Please fix the errors above.", "fa-triangle-exclamation"); return; }
      state.street = $("fStreet").value.trim();
      state.landmark = $("fLandmark").value.trim();
      state.district = $("fDistrict").value.trim();
      state.pincode = $("fPincode").value.trim();
      state.addrState = $("fState").value;
      state.addrCountry = $("fCountry").value;
      showToast("Address Saved Successfully", "fa-circle-check");
    });

    $("toPasswordBtn").addEventListener("click", () => {
      if (!validateAddressFields()) { showToast("Please fix the errors above.", "fa-triangle-exclamation"); return; }
      state.street = $("fStreet").value.trim();
      state.landmark = $("fLandmark").value.trim();
      state.district = $("fDistrict").value.trim();
      state.pincode = $("fPincode").value.trim();
      state.addrState = $("fState").value;
      state.addrCountry = $("fCountry").value;
      goToSection(2);
    });
  }

  /* ---------------------------------------------------------
     6. SECTION 3 — PASSWORD
     --------------------------------------------------------- */
  function wirePasswordToggles() {
    document.querySelectorAll(".pw-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = $(btn.dataset.target);
        const icon = btn.querySelector("i");
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        icon.classList.toggle("fa-eye", !show);
        icon.classList.toggle("fa-eye-slash", show);
      });
    });
  }

  function passwordScore(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  function renderStrength(pw) {
    const bars = document.querySelectorAll("#strengthMeter span");
    const label = $("strengthLabel");
    const score = passwordScore(pw);
    let level = 0, text = "", cls = "";

    if (!pw) { level = 0; text = ""; }
    else if (score <= 2) { level = 1; text = "Weak"; cls = "weak"; }
    else if (score <= 4) { level = 3; text = "Medium"; cls = "medium"; }
    else { level = 4; text = "Strong"; cls = "strong"; }

    const colors = { weak: "var(--red-600)", medium: "var(--yellow-600)", strong: "var(--green-600)" };
    bars.forEach((bar, i) => { bar.style.background = i < level ? colors[cls] : ""; });
    label.textContent = text || "\u00A0";
    label.className = "strength-label " + cls;
  }

  function validatePassword() {
    const pw = $("fPassword").value;
    const rules = pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
    if (!rules) {
      setError("fPassword", "Min 8 characters incl. uppercase, lowercase, number & special character.");
      return false;
    }
    setError("fPassword", "");
    return true;
  }

  function validateConfirmPassword() {
    const pw = $("fPassword").value;
    const cpw = $("fConfirmPassword").value;
    if (!cpw) { setError("fConfirmPassword", "Please confirm your password."); return false; }
    if (pw !== cpw) { setError("fConfirmPassword", "Passwords do not match."); return false; }
    setError("fConfirmPassword", "");
    return true;
  }

  function wirePasswordSection() {
    $("fPassword").addEventListener("input", () => renderStrength($("fPassword").value));
    $("pwPrevBtn").addEventListener("click", () => goToSection(1));

    $("submitBtn").addEventListener("click", () => {
      const okPw = validatePassword();
      const okConfirm = validateConfirmPassword();
      if (!okPw || !okConfirm) { showToast("Please fix the errors above.", "fa-triangle-exclamation"); return; }

      state.password = $("fPassword").value;
      saveUser()
.then(() => {

    showToast("Account Created Successfully!");

    runLoadingThenProfile();

})
.catch((err) => {

    console.error(err);

    showToast("Failed to save user.");

});
    });
  }

  /* ---------------------------------------------------------
     7. LOADING -> PROFILE
     --------------------------------------------------------- */
     async function saveUser() {

    const user = firebase.auth().currentUser;

    if (!user) {

        alert("No authenticated user found!");

        return;

    }

    await db.collection("users").doc(user.uid).set({

        username: state.username,
        password: state.password,
        dob: state.dob,
        phone: user.phoneNumber,

        street: state.street,
        landmark: state.landmark,
        district: state.district,
        pincode: state.pincode,
        state: state.addrState,
        country: state.addrCountry,

        createdAt: firebase.firestore.FieldValue.serverTimestamp()

    });

}
  function runLoadingThenProfile() {
    $("loadingOverlay").classList.add("show");
    setTimeout(() => {
      $("loadingOverlay").classList.remove("show");
      populateProfile();
      SECTIONS.forEach((id) => $(id).classList.remove("active"));
      $("wizardHead").style.display = "none";
      $("section-profile").classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 3000);
  }

  function populateProfile() {
    $("pfName").textContent = state.username;
    $("pfDob").textContent = formatDob(state.dob);
    $("pfPhone").textContent = `${state.countryFlag} ${state.countryCode} ${state.phone}`;
    $("pfStreet").textContent = state.street;
    $("pfLandmark").textContent = state.landmark;
    $("pfDistrict").textContent = state.district;
    $("pfPincode").textContent = state.pincode;
    $("pfState").textContent = state.addrState;
    $("pfCountry").textContent = state.addrCountry;
    $("pfPassword").textContent = "•".repeat(Math.max(state.password.length, 8));
    $("profileAvatar").src = `https://ui-avatars.com/api/?background=2f6fed&color=fff&bold=true&name=${encodeURIComponent(state.username || "U")}`;
  }

  function formatDob(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function wireProfileActions() {
    $("profileBackBtn").addEventListener("click", () => {
      $("section-profile").classList.remove("active");
      $("wizardHead").style.display = "";
      goToSection(2);
    });
    $("loginBtn").addEventListener("click", () => {
      window.location.href = "../userdashboard/index.html";
    });
  }

  /* ---------------------------------------------------------
     8. INIT
     --------------------------------------------------------- */
 function init() {

    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
        "recaptcha-container",
        {
            size: "invisible"
        }
    );

    window.recaptchaVerifier.render();

    startLiveClock();
    wireCountrySelect();
    wireVerifyButton();
    wireNextFromAccount();
    wireOtpBoxes();
    wireOtpActions();
    wireDistrictAutocomplete();
    wireAddressActions();
    wirePasswordToggles();
    wirePasswordSection();
    wireProfileActions();

    goToSection(0);
}

  document.addEventListener("DOMContentLoaded", init);
})();
