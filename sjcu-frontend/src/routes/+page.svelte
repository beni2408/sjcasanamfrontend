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
  
  <div class="min-h-screen flex bg-gray-50">

    <!-- Left decorative panel -->
    <div class="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden" style="background:#b91c1c;">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),_transparent_60%)]"></div>
      <div class="absolute bottom-0 left-0 w-80 h-80 bg-red-900/60 rounded-full -translate-x-1/2 translate-y-1/2"></div>
      <div class="relative z-10">
        <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1771403084/SJC_app_logo-2-SJC_reciept_web_logo_1_qy0x7l.png" alt="Logo" class="w-16 h-16 rounded-2xl mb-10" />
        <h2 class="text-4xl font-extrabold text-white leading-tight mb-4">
          St. John's Church<br/>Madathuvilai
        </h2>
        <p class="text-red-200 text-base leading-relaxed max-w-sm">
          Donation management system for the 132nd Asanam Thanksgiving Festival — securely track, receipt, and report all contributions.
        </p>
      </div>
      <p class="relative z-10 text-red-300 text-xs">St. John's Church Paribalana Committee</p>
    </div>

    <!-- Right login panel -->
    <div class="flex flex-col justify-center items-center w-full lg:w-1/2 px-6 py-12">
      <div class="w-full max-w-sm">

        <!-- Logo (mobile only) -->
        <div class="flex items-center gap-3 mb-8 lg:hidden">
          <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1771403084/SJC_app_logo-2-SJC_reciept_web_logo_1_qy0x7l.png" alt="Logo" class="w-10 h-10 rounded-xl" />
          <span class="font-bold text-gray-800 text-sm">St. John's Church Madathuvilai</span>
        </div>

        <h1 class="text-2xl font-bold mb-1" style="color:#b91c1c;">Welcome back</h1>
        <p class="text-sm text-gray-400 mb-8">Sign in to your admin account</p>

        {#if error}
          <div class="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
            <i class="fas fa-exclamation-circle shrink-0"></i>
            <span>{error}</span>
          </div>
        {/if}

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email Address</label>
            <div class="relative">
              <i class="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="email"
                bind:value={email}
                on:keydown={(e) => e.key === 'Enter' && handleLogin()}
                class="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
                placeholder="admin@sjcmadathuvilai.in"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Password</label>
            <div class="relative">
              <i class="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type={showPassword ? "text" : "password"}
                bind:value={password}
                on:keydown={(e) => e.key === 'Enter' && handleLogin()}
                class="w-full border border-gray-200 rounded-lg pl-9 pr-10 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                title={showPassword ? 'Hide password' : 'Show password'}
                on:click={() => showPassword = !showPassword}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i class="fas {showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        <button
          on:click={handleLogin}
          disabled={loading}
          class="w-full mt-6 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm" style="background:#b91c1c;"
        >
          {#if loading}
            <i class="fas fa-spinner fa-spin text-xs"></i> Signing in...
          {:else}
            <i class="fas fa-sign-in-alt text-xs"></i> Sign In
          {/if}
        </button>

      </div>
    </div>

  </div>
  