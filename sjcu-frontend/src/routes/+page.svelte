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
  
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-4 relative overflow-hidden">
    <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
  
    <div class="relative bg-gray-800/90 backdrop-blur-xl shadow-2xl rounded-3xl p-10 w-full max-w-md border border-gray-700/50">
  
      <div class="flex flex-col items-center mb-8">
        <div class="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 p-4 rounded-2xl mb-4 border border-indigo-500/30">
          <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1771403084/SJC_app_logo-2-SJC_reciept_web_logo_1_qy0x7l.png" alt="Logo" class="w-24 h-24" />
        </div>
        <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
          Admin Login
        </h1>
        <p class="text-sm text-gray-400">St. John's Church - Madathuvilai</p>
      </div>
  
      {#if error}
        <div class="bg-red-500/20 border-l-4 border-red-500 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-3 backdrop-blur-sm">
          <i class="fas fa-exclamation-circle text-xl"></i>
          <span class="text-sm">{error}</span>
        </div>
      {/if}
  
      <div class="mb-5">
        <label class="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
        <div class="relative">
          <i class="fas fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
          <input
            type="email"
            bind:value={email}
            class="w-full border-2 border-gray-700 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all bg-gray-900/50 text-gray-200 placeholder-gray-500"
            placeholder="admin@example.com"
          />
        </div>
      </div>
  
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
        <div class="relative">
          <i class="fas fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
          <input
            type={showPassword ? "text" : "password"}
            bind:value={password}
            class="w-full border-2 border-gray-700 rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all bg-gray-900/50 text-gray-200 placeholder-gray-500"
            placeholder="Enter your password"
          />
          <button
            type="button"
            on:click={() => showPassword = !showPassword}
            class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <i class="fas {showPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>
          </button>
        </div>
      </div>
  
      <button
        on:click={handleLogin}
        disabled={loading}
        class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/60 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg flex items-center justify-center gap-2"
      >
        {#if loading}
          <i class="fas fa-spinner fa-spin"></i> Logging in...
        {:else}
          <i class="fas fa-sign-in-alt"></i> Login
        {/if}
      </button>
  
    </div>
  
  </div>
  