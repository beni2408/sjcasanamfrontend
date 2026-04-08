<script>
    import api from "$lib/api/axios";
    import { goto } from "$app/navigation";
  
    let email = "";
    let password = "";
    let loading = false;
    let error = "";
    let showPassword = false;
  
    const handleLogin = async () => {
      try {
        loading = true;
        error = "";
  
        const res = await api.post("/auth/login", {
          email,
          password,
        });
  
        const { token } = res.data;
  
        localStorage.setItem("token", token);
  
        goto("/dashboard");
  
      } catch (err) {
        error =
          err.response?.data?.message || "Login failed. Try again.";
      } finally {
        loading = false;
      }
    };
  </script>
  
  <style>
    .login-btn {
      background: linear-gradient(135deg, #991b1b 0%, #b91c1c 50%, #dc2626 100%);
      transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 4px 20px rgba(185,28,28,0.45), 0 1px 3px rgba(185,28,28,0.3);
    }
    .login-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%);
      box-shadow: 0 8px 28px rgba(185,28,28,0.55), 0 2px 6px rgba(185,28,28,0.35);
      transform: translateY(-2px);
    }
    .login-btn:active:not(:disabled) { transform: translateY(0); }
    .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .input-wrap { position: relative; }
    .input-field {
      width: 100%; border: 1.5px solid #e5e7eb; border-radius: 12px;
      padding: 13px 16px; font-size: 15px; color: #111827; background: #f9fafb;
      outline: none; transition: all 0.2s; box-sizing: border-box; font-family: inherit;
    }
    .input-field:focus { border-color: #b91c1c; background: #fff; box-shadow: 0 0 0 4px rgba(185,28,28,0.1); }
    .input-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#9ca3af; font-size:14px; pointer-events:none; }
    .input-field.has-icon { padding-left:42px; }
    .input-field.has-toggle { padding-right:44px; }
    .toggle-btn { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; color:#9ca3af; cursor:pointer; padding:4px; display:flex; align-items:center; }
    .toggle-btn:hover { color:#6b7280; }
    .deco-circle { position:absolute; border-radius:50%; }
    .feature-row { display:flex; align-items:center; gap:14px; padding:10px 0; }
    .feature-icon-wrap { width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.14); display:flex; align-items:center; justify-content:center; flex-shrink:0; backdrop-filter:blur(4px); }
    .divider-line { height:1px; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent); margin:28px 0; }
  </style>

  <div style="min-height:100vh; display:flex; background:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

    <!-- ── LEFT PANEL ── -->
    <div class="hidden lg:flex" style="width:50%; flex-direction:column; justify-content:space-between; padding:52px 56px; position:relative; overflow:hidden; background:linear-gradient(145deg, #450a0a 0%, #7f1d1d 35%, #991b1b 65%, #b91c1c 100%);">

      <!-- Decorative shapes -->
      <div class="deco-circle" style="width:380px;height:380px;background:rgba(255,255,255,0.05);top:-100px;right:-100px;"></div>
      <div class="deco-circle" style="width:240px;height:240px;background:rgba(255,255,255,0.06);bottom:40px;left:-80px;"></div>
      <div class="deco-circle" style="width:140px;height:140px;background:rgba(255,255,255,0.07);bottom:200px;right:80px;"></div>
      <div class="deco-circle" style="width:60px;height:60px;background:rgba(255,255,255,0.1);top:200px;left:40px;"></div>

      <!-- Top brand -->
      <div style="position:relative;z-index:10;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:56px;">
          <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1771403084/SJC_app_logo-2-SJC_reciept_web_logo_1_qy0x7l.png" alt="Logo"
               style="width:54px;height:54px;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,0.35);border:2px solid rgba(255,255,255,0.2);" />
          <div>
            <div style="color:rgba(255,255,255,0.55);font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:3px;">St. John's Church</div>
            <div style="color:#fff;font-size:16px;font-weight:800;letter-spacing:-0.2px;">Madathuvilai</div>
          </div>
        </div>

        <h2 style="font-size:40px;font-weight:900;color:#fff;line-height:1.1;margin:0 0 18px;letter-spacing:-1px;">
          Donation<br/>Management<br/>System
        </h2>
        <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.75;max-width:310px;margin-bottom:36px;">
          132nd Asanam Thanksgiving Festival — securely track, receipt, and report all contributions.
        </p>

        <div class="divider-line"></div>

        <div style="display:flex;flex-direction:column;gap:2px;">
          <div class="feature-row">
            <div class="feature-icon-wrap"><i class="fas fa-receipt" style="font-size:14px;color:#fca5a5;"></i></div>
            <span style="color:rgba(255,255,255,0.8);font-size:14px;font-weight:500;">Instant receipt generation &amp; printing</span>
          </div>
          <div class="feature-row">
            <div class="feature-icon-wrap"><i class="fas fa-chart-bar" style="font-size:14px;color:#fca5a5;"></i></div>
            <span style="color:rgba(255,255,255,0.8);font-size:14px;font-weight:500;">Real-time donation analytics</span>
          </div>
          <div class="feature-row">
            <div class="feature-icon-wrap"><i class="fas fa-envelope" style="font-size:14px;color:#fca5a5;"></i></div>
            <span style="color:rgba(255,255,255,0.8);font-size:14px;font-weight:500;">Automated email notifications</span>
          </div>
          <div class="feature-row">
            <div class="feature-icon-wrap"><i class="fas fa-file-excel" style="font-size:14px;color:#fca5a5;"></i></div>
            <span style="color:rgba(255,255,255,0.8);font-size:14px;font-weight:500;">Excel export for reporting</span>
          </div>
        </div>
      </div>

      <!-- Bottom footer -->
      <div style="position:relative;z-index:10;border-top:1px solid rgba(255,255,255,0.12);padding-top:20px;">
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">© 2025 St. John's Church Paribalana Committee</p>
      </div>
    </div>

    <!-- ── RIGHT PANEL ── -->
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 24px; background:#fff;">
      <div style="width:100%;max-width:380px;">

        <!-- Mobile logo -->
        <div class="lg:hidden" style="display:flex;align-items:center;gap:12px;margin-bottom:32px;">
          <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1771403084/SJC_app_logo-2-SJC_reciept_web_logo_1_qy0x7l.png" alt="Logo"
               style="width:42px;height:42px;border-radius:11px;" />
          <span style="font-weight:800;color:#111827;font-size:15px;">St. John's Church Madathuvilai</span>
        </div>

        <!-- Header badge + title -->
        <div style="margin-bottom:36px;">
          <div style="display:inline-flex;align-items:center;gap:7px;background:#fef2f2;border:1px solid #fecaca;border-radius:20px;padding:5px 14px;margin-bottom:18px;">
            <div style="width:7px;height:7px;border-radius:50%;background:#b91c1c;animation:pulse 2s infinite;"></div>
            <span style="font-size:11px;font-weight:700;color:#b91c1c;letter-spacing:0.08em;text-transform:uppercase;">Admin Portal</span>
          </div>
          <h1 style="font-size:30px;font-weight:900;color:#111827;margin:0 0 10px;letter-spacing:-0.8px;">Welcome back</h1>
          <p style="font-size:15px;color:#6b7280;margin:0;">Sign in to continue to your dashboard</p>
        </div>

        {#if error}
          <div style="display:flex;align-items:flex-start;gap:10px;background:#fef2f2;border:1.5px solid #fca5a5;color:#b91c1c;font-size:14px;padding:13px 16px;border-radius:12px;margin-bottom:22px;">
            <i class="fas fa-circle-exclamation" style="margin-top:1px;flex-shrink:0;"></i>
            <span>{error}</span>
          </div>
        {/if}

        <div style="display:flex;flex-direction:column;gap:20px;">
          <div>
            <label for="login-email" style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;letter-spacing:0.01em;">Email Address</label>
            <div class="input-wrap">
              <i class="fas fa-envelope input-icon"></i>
              <input id="login-email" type="email" bind:value={email}
                on:keydown={(e) => e.key === 'Enter' && handleLogin()}
                class="input-field has-icon"
                placeholder="admin@sjcmadathuvilai.in"
              />
            </div>
          </div>

          <div>
            <label for="login-password" style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;letter-spacing:0.01em;">Password</label>
            <div class="input-wrap">
              <i class="fas fa-lock input-icon"></i>
              <input id="login-password" type={showPassword ? "text" : "password"} bind:value={password}
                on:keydown={(e) => e.key === 'Enter' && handleLogin()}
                class="input-field has-icon has-toggle"
                placeholder="••••••••"
              />
              <button type="button" title={showPassword ? 'Hide password' : 'Show password'}
                on:click={() => showPassword = !showPassword}
                class="toggle-btn">
                <i class="fas {showPassword ? 'fa-eye-slash' : 'fa-eye'}" style="font-size:15px;"></i>
              </button>
            </div>
          </div>
        </div>

        <button on:click={handleLogin} disabled={loading} class="login-btn"
          style="width:100%;margin-top:28px;color:#fff;font-size:15px;font-weight:700;padding:15px;border-radius:12px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;letter-spacing:0.02em;">
          {#if loading}
            <i class="fas fa-spinner fa-spin"></i> Signing in...
          {:else}
            Sign In <i class="fas fa-arrow-right"></i>
          {/if}
        </button>

        <div style="margin-top:28px;display:flex;align-items:center;gap:10px;">
          <div style="flex:1;height:1px;background:#f3f4f6;"></div>
          <span style="font-size:12px;color:#d1d5db;">Secure Access</span>
          <div style="flex:1;height:1px;background:#f3f4f6;"></div>
        </div>

        <p style="text-align:center;margin-top:16px;font-size:12.5px;color:#9ca3af;">
          <i class="fas fa-shield-halved" style="margin-right:5px;color:#d1d5db;"></i>
          St. John's Church Paribalana Committee
        </p>

      </div>
    </div>

  </div>
  