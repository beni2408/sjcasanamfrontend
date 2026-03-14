<script>
    import api from "$lib/api/axios";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import CityAutocomplete from "$lib/CityAutocomplete.svelte";
  
    let data = null;
    let loading = true;
    let search = "";
    let searchType = "name";
    let debounceTimer;
    let donations = [];
    let currentFilters = {};
    let showAddForm = false;
    let editingId = null;
    let formData = {
      name: "",
      address: "",
      phone: "",
      email: "",
      donated_amount: "",
      paymentMode: "HAND",
      transactionId: "",
      description: "",
      donationDate: new Date().toISOString().split('T')[0]
    };

    let editingEmailRow = null;
let customEmail = "";
let sending = false;

async function sendCustomEmail(id) {

if (!customEmail) {
  alert("Please enter an email address.");
  return;
}

if (!validateEmail(customEmail)) {
  alert("Please enter a valid email address.");
  return;
}

try {

  sending = true;

  await api.post(`/send-custom-email/${id}`, {
    email: customEmail
  });

  alert("Receipt sent successfully!");

  editingEmailRow = null;
  customEmail = "";

} catch (error) {

  alert("Failed to send email. Please try again.");

} finally {

  sending = false;

}
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
  
    const fetchDashboard = async (filters = {}) => {
      loading = true;
  
      const res = await api.get("/dashboard", {
        params: filters,
      });
  
      data = res.data;
  
      loading = false;
    };
  
    onMount(() => {
      fetchDashboard();
    });
  
    const handleSearch = (value) => {

search = value;

clearTimeout(debounceTimer);

debounceTimer = setTimeout(() => {

  const filter = {};
  if (searchType === "name") {
    filter.name = search;
  } else if (searchType === "receipt") {
    filter.receiptNumber = search;
  }
  fetchDonations(filter);

}, 300);
};

const handlePrint = async (id) => {

try {

  const res = await api.get(`/print-receipt/${id}`, {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(res.data);

  const printWindow = window.open(url);

  printWindow.onload = () => {
    printWindow.print();
  };

} catch (error) {
  alert("Failed to print receipt");
}
};



async function sendEmail(id) {
  try {
    await api.post(`/send-email/${id}`);

    alert("Email request sent successfully");
  } catch (error) {
    alert("Failed to send email");
  }
}
const handlePDF = async (id) => {

try {

  const res = await api.get(`/pdf-receipt/${id}`, {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(res.data);

  const link = document.createElement("a");
  link.href = url;
  link.download = `receipt-${id}.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();

} catch (error) {
  alert("Failed to download receipt");
}
};

const handleExport = async () => {
  try {
    const res = await api.get("/export/excel", {
      params: currentFilters,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `donations-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    alert("Failed to export data");
  }
};

const handleAddDonation = async (printAfter = false) => {
  try {

    const payload = {
      ...formData,
      paymentmethod: formData.paymentMode
    };

    if (editingId) {
      await api.put(`/donations/${editingId}`, payload);
      
      if (printAfter) {
        await handlePrint(editingId);
      }
      
      editingId = null;
    } else {
      const res = await api.post("/donations", payload);
      const receiptNumber = res.data.donation?.receiptNumber;

      if (printAfter && receiptNumber) {
        // Wait for n8n to sync to database
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch donations to get the ID
        const donationsRes = await api.get("/donations", {
          params: { receiptNumber }
        });
        
        if (donationsRes.data && donationsRes.data.length > 0) {
          await handlePrint(donationsRes.data[0]._id);
        } else {
          alert("Donation saved! Please wait a moment and print from the table.");
        }
      }
    }

    showAddForm = false;

    formData = {
      name: "",
      address: "",
      phone: "",
      email: "",
      donated_amount: "",
      paymentMode: "HAND",
      transactionId: "",
      description: "",
      donationDate: new Date().toISOString().split('T')[0]
    };

    await fetchDashboard();
    await fetchDonations();

  } catch (error) {
    console.error("Save error:", error);
    alert("Failed to save donation");
  }
};

const handleEdit = (donation) => {
  editingId = donation._id;

  formData = {
    name: donation.name,
    address: donation.address,
    phone: donation.phone || "",
    email: donation.email || "",
    donated_amount: donation.donated_amount,
    paymentMode: donation.paymentMode,
    transactionId: donation.transactionId || "",
    description: donation.description || "",
    receiptNumber: donation.receiptNumber,   // ⭐⭐⭐⭐⭐ FIX
    donationDate: new Date(donation.donationDate)
      .toISOString()
      .split('T')[0]
  };

  showAddForm = true;
};
const handleDelete = async (id) => {
  if (!confirm("Are you sure you want to delete this donation?")) return;
  
  try {
    await api.delete(`/donations/${id}`);
    fetchDashboard();
    fetchDonations();
    alert("Donation deleted successfully!");
  } catch (error) {
    alert("Failed to delete donation");
  }
};


    const handleLogout = () => {
      localStorage.removeItem("token");
      goto("/");
    };

    const fetchDonations = async (filters = {}) => {

loading = true;
currentFilters = filters;

const res = await api.get("/donations", {
  params: filters
});

donations = res.data;

loading = false;
};

onMount(() => {
  fetchDashboard();   // 💰 Summary cards
  fetchDonations();   // 📊 Table data
});

  </script>
  
  <div class="min-h-screen bg-gradient-to-br from-white-900 via-white-900 to-white-900 p-8 relative overflow-hidden">
    <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
    
    <!-- HEADER -->
    <div class="relative bg-red-700 backdrop-blur-xl shadow-2xl rounded-3xl p-6 mb-8 flex justify-between items-center border-white-700/50 hover:shadow-indigo-500/20 transition-all duration-300">
      <div class="flex items-center gap-4">
     
        <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1771417669/SJC_app_logo-2-SJC_reciept_web_logo_5_nysuyc.png" alt="Logo" class="w-14 h-14" />
        <div>
          <h1 class="text-3xl font-bold text-white">
            St.John's Church Madathuvilai Donation Management
          </h1>
          <p class="text-sm text-white">St. John's Church Paribalana Committee</p>
        </div>
      </div>
  
      <div class="flex gap-3">
        <button
          on:click={() => { showAddForm = true; editingId = null; }}
          class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/60 hover:scale-105 transition-all duration-300 flex items-center gap-2 font-semibold"
        >
          <i class="fas fa-plus"></i> Add Donation
        </button>
        <button
          on:click={handleLogout}
          class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-red-500 hover:to-pink-500 shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-500/60 hover:scale-105 transition-all duration-300 flex items-center gap-2 font-semibold"
        >
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  
    <!-- SUMMARY CARDS -->
    {#if data}
      <div class="relative grid grid-cols-4 gap-6 mb-8">
  
        <div class="group bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 shadow-xl shadow-cyan-500/20 rounded-3xl p-6 text-white hover:shadow-2xl hover:shadow-cyan-500/30 transition-all duration-300 relative overflow-hidden  border-cyan-500/20">
          <div class="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-3">
              <p class="text-cyan-100 text-sm font-semibold uppercase tracking-wide">Total Amount</p>
              <div class="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <i class="fas fa-coins text-2xl"></i>
              </div>
            </div>
            <p class="text-4xl font-extrabold mb-1">
              ₹{data.totalAmount}
            </p>
            <div class="h-1 w-16 bg-cyan-400/60 rounded-full mt-2"></div>
          </div>
        </div>
  
        <div class="group bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 shadow-xl shadow-emerald-500/20 rounded-3xl p-6 text-white hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 relative overflow-hidden  border-emerald-500/20">
          <div class="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-3">
              <p class="text-emerald-100 text-sm font-semibold uppercase tracking-wide">Today's Collection</p>
              <div class="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <i class="fas fa-calendar-day text-2xl"></i>
              </div>
            </div>
            <p class="text-4xl font-extrabold mb-1">
              ₹{data.todayAmount}
            </p>
            <div class="h-1 w-16 bg-emerald-400/60 rounded-full mt-2"></div>
          </div>
        </div>
  
        <div class="group bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-700 shadow-xl shadow-purple-500/20 rounded-3xl p-6 text-white hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 relative overflow-hidden  border-purple-500/20">
          <div class="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-3">
              <p class="text-purple-100 text-sm font-semibold uppercase tracking-wide">Cash Collection</p>
              <div class="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <i class="fas fa-money-bill-wave text-2xl"></i>
              </div>
            </div>
            <p class="text-4xl font-extrabold mb-1">
              ₹{data.cashAmount}
            </p>
            <div class="h-1 w-16 bg-purple-400/60 rounded-full mt-2"></div>
          </div>
        </div>
  
        <div class="group bg-gradient-to-br from-red-600 via-red-600 to-gray-700 shadow-xl shadow-orange-500/20 rounded-3xl p-6 text-white hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 relative overflow-hidden  border-orange-500/20">
          <div class="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-3">
              <p class="text-orange-100 text-sm font-semibold uppercase tracking-wide">UPI Collection</p>
              <div class="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <i class="fas fa-mobile-alt text-2xl"></i>
              </div>
            </div>
            <p class="text-4xl font-extrabold mb-1">
              ₹{data.upiAmount}
            </p>
            <div class="h-1 w-16 bg-orange-400/60 rounded-full mt-2"></div>
          </div>
        </div>
  
      </div>
    {/if}
  
    <!-- FILTERS -->
    <div class="relative bg-white-800/80 backdrop-blur-xl shadow-xl rounded-3xl p-6 mb-6 border  border-white-700/50">
      <div class="flex gap-4 mb-4">
        <select bind:value={searchType} class="border-2 border-gray-400 rounded-xl px-4 py-3 focus:border-red-700 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-white-900/50 text-black-200 hover:border-red-600">
          <option value="name">Search by Name</option>
          <option value="receipt">Search by Receipt No</option>
        </select>
        <input
          type="text"
          placeholder={searchType === "name" ? "Search donor..." : "Search receipt number..."}
          class="flex-1 border-2 border-gray-400 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-white-900/50 text-black-200 placeholder-black-500 hover:border-red-600"
          on:input={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div class="flex gap-3">
        <select
          class="border-2 border-gray-400 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-white-900/50 text-black-200 hover:border-red-600"
          on:change={(e) => fetchDonations({ paymentMode: e.target.value })}
        >
          <option value="">All Payments</option>
          <option value="HAND">Cash</option>
          <option value="UPI">UPI</option>
        </select>
      
        <select
          class="border-2 border-gray-400 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-white-900/50 text-black-200 hover:border-red-600"
          on:change={(e) => {
            const value = e.target.value;
            if (!value) return fetchDonations();
            const [sortBy, order] = value.split("-");
            fetchDonations({ sortBy, order });
          }}
        >
          <option value="">No Filters</option>
          <option value="donated_amount-desc">Amount High → Low</option>
          <option value="donated_amount-asc">Amount Low → High</option>
          <option value="donationDate-desc">Latest First</option>
          <option value="donationDate-asc">Oldest First</option>
        </select>

        <button
          on:click={handleExport}
          class="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/60 hover:scale-105 transition-all duration-300 ml-auto flex items-center gap-2 font-semibold"
        >
          <i class="fas fa-file-excel"></i> Export to Excel
        </button>
      </div>
    </div>
      
  
    <!-- DONATION TABLE -->
    <div class="relative bg-white-800/80 backdrop-blur-xl shadow-xl rounded-3xl overflow-hidden border border-gray-700/50">
  
      {#if loading}
        <p class="p-8 text-black-400 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>Loading donations...</p>
      {:else if data?.donations?.length === 0}
        <p class="p-8 text-black-400 text-center">No donations found</p>
      {:else}
        <div class="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table class="w-full">
  
          <thead class="bg-gradient-to-r from-red-900/90 to-gray-800/90  sticky top-0 backdrop-blur-sm">
            <tr>
              <th class="p-4 text-left text-xs font-bold text-white uppercase tracking-wider">Name</th>
              <th class="p-4 text-left text-xs font-bold text-white uppercase tracking-wider">Amount</th>
              <th class="p-4 text-left text-xs font-bold text-white uppercase tracking-wider">Receipt Number</th>
              <th class="p-4 text-left text-xs font-bold text-white uppercase tracking-wider">Payment Method</th>
              <th class="p-4 text-left text-xs font-bold text-white uppercase tracking-wider">Date</th>
              <th class="p-4 text-center text-xs font-bold text-white uppercase tracking-wider ">Actions</th>
            </tr>
          </thead>
  
          <tbody class="divide-y divide-gray-700/50">
            {#each donations as donation}
              <tr class="hover:bg-gradient-to-r hover:from-red-900/30 hover:to-black-900/30 transition-all duration-200">
                <td class="p-4 text-sm font-medium text-black-200">{donation.name}</td>
                <td class="p-4 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-700">
                  ₹{donation.donated_amount}
                </td>
                <td class="p-4 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-900">
                  {donation.receiptNumber}
                </td>
                <td class="p-4 text-sm">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold {donation.paymentMode === 'UPI' ? 'bg-purple-500/20 text-purple-700 border border-purple-500/30' : 'bg-purple-100 to-pink-700  border border-purple text-purple-600 via-fuchsia-600 '}">
                    {donation.paymentMode === 'UPI' ? 'UPI' : 'Cash'}
                  </span>
                </td>
                <td class="p-4 text-sm text-black-400">
                  {new Date(donation.donationDate).toLocaleDateString()}
                </td>
                <td class="p-4">
                  <div class="flex gap-2">
                    <button
                      on:click={() => handleEdit(donation)}
                      class="bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-900 border border-amber-500/30 px-3 py-2 rounded-xl hover:from-amber-600/30 hover:to-orange-600/30 hover:scale-105 transition-all duration-200 text-sm flex items-center gap-1.5 font-medium shadow-sm"
                    >
                      <i class="fas fa-edit"></i> Edit
                    </button>

                    <button
                      on:click={() => handlePrint(donation._id)}
                      class="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-900 border border-blue-500/30 px-3 py-2 rounded-xl hover:from-blue-600/30 hover:to-indigo-600/30 hover:scale-105 transition-all duration-200 text-sm flex items-center gap-1.5 font-medium shadow-sm"
                    >
                      <i class="fas fa-print"></i> Print
                    </button>
                  
                    <button
                      on:click={() => handlePDF(donation._id)}
                      class="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-900 border border-emerald-500/30 px-3 py-2 rounded-xl hover:from-emerald-600/30 hover:to-teal-600/30 hover:scale-105 transition-all duration-200 text-sm flex items-center gap-1.5 font-medium shadow-sm"
                    >
                      <i class="fas fa-file-pdf"></i> PDF
                    </button>

                    <button
                      on:click={() => handleDelete(donation._id)}
                      class="bg-gradient-to-r from-red-600/20 to-pink-600/20 text-red-700 border border-red-500/30 px-3 py-2 rounded-xl hover:from-red-600/30 hover:to-pink-600/30 hover:scale-105 transition-all duration-200 text-sm flex items-center gap-1.5 font-medium shadow-sm"
                    >
                      <i class="fas fa-trash"></i> Delete
                    </button>
                    <button
    class="bg-gradient-to-r from-blue-600/20 to-blue-600/20 text-blue-900 border border-blue-500/30 px-3 py-2 rounded-xl hover:from-blue-600/30 hover:to-blue-600/30 hover:scale-105 transition-all duration-200 text-sm flex items-center gap-1.5 font-medium shadow-sm"
  on:click={() => sendEmail(donation._id)}
><i class="fa fa-envelope"></i>
  Mail receipt
</button>

{#if editingEmailRow === donation._id}

<input
    type="email"
    placeholder="Enter email address"
    bind:value={customEmail}
    class="w-46 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-full
           bg-white shadow-sm
           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
           transition-all duration-200"
  />

<!-- SEND BUTTON -->
<button
  class="bg-green-600 hover:bg-green-700 text-white p-2 rounded"
  disabled={sending}
  on:click={() => sendCustomEmail(donation._id)}
  title="Send"
>
  {#if sending}
    <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" opacity="0.3"/>
      <path d="M22 12a10 10 0 00-10-10" stroke="white" stroke-width="4"/>
    </svg>
  {:else}
    <svg xmlns="http://www.w3.org/2000/svg"
         class="w-4 h-4"
         fill="none"
         viewBox="0 0 24 24"
         stroke="currentColor"
         stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M3 10l18-7-7 18-2-7-7-4z"/>
    </svg>
  {/if}
</button>

<!-- CANCEL BUTTON -->
<button
  class="bg-red-700 hover:bg-red-800 text-white p-2 rounded"
  title="Cancel"
  on:click={() => {
    editingEmailRow = null;
    customEmail = "";
  }}
>
  <svg xmlns="http://www.w3.org/2000/svg"
       class="w-4 h-4"
       fill="none"
       viewBox="0 0 24 24"
       stroke="currentColor"
       stroke-width="2">
    <path stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 18L18 6M6 6l12 12"/>
  </svg>
</button>

{:else}

<button
  class="bg-gradient-to-r from-purple-600/60 to-purple-600/20 text-purple-900 border border-purple-500 px-3 py-2 rounded-xl hover:from-purple-600/30 hover:to-purple-600/30 hover:scale-105 transition-all duration-200 text-sm flex items-center gap-1.5 font-medium shadow-sm"
  on:click={() => editingEmailRow = donation._id}
>
Send to Others
</button>

{/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
  
        </table>
        </div>
      {/if}
  
    </div>
  
    {#if showAddForm}
    <div class="fixed inset-0 bg-gradient-to-br from-black/80 via-gray-900/80 to-black/80 flex items-center justify-center z-50 backdrop-blur-lg animate-fadeIn">
      <div class="bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700/50 animate-slideUp">
        <h2 class="text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">{editingId ? 'Edit Donation' : 'Add New Donation'}</h2>
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Name *</label>
            <input bind:value={formData.name} class="w-full border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-gray-900/50 text-gray-200" required />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Amount *</label>
            <input type="number" bind:value={formData.donated_amount} class="w-full border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-gray-900/50 text-gray-200" required />
          </div>
          <div class="col-span-2">
            <label class="block text-sm font-semibold text-gray-300 mb-2">Address (City/Town) *</label>
            <CityAutocomplete bind:value={formData.address} placeholder="Start typing city name..." required />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Phone</label>
            <input bind:value={formData.phone} class="w-full border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-gray-900/50 text-gray-200" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Email</label>
            <input type="email" bind:value={formData.email} class="w-full border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-gray-900/50 text-gray-200" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Payment Mode *</label>
            <select bind:value={formData.paymentMode} class="w-full border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-gray-900/50 text-gray-200">
              <option value="HAND">Cash</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">Donation Date *</label>
            <input type="date" bind:value={formData.donationDate} class="w-full border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-gray-900/50 text-gray-200" required />
          </div>
          {#if formData.paymentMode === "UPI"}
          <div class="col-span-2">
            <label class="block text-sm font-semibold text-gray-300 mb-2">Transaction ID</label>
            <input bind:value={formData.transactionId} class="w-full border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-gray-900/50 text-gray-200" />
          </div>
          {/if}
          <div class="col-span-2">
            <label class="block text-sm font-semibold text-gray-300 mb-2">Description</label>
            <textarea bind:value={formData.description} class="w-full border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-gray-900/50 text-gray-200" rows="2"></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-8">
          <button on:click={() => handleAddDonation(false)} class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/60 hover:scale-105 transition-all duration-300 font-semibold">{editingId ? 'Update' : 'Save'}</button>
          {#if !editingId}
          <button on:click={() => handleAddDonation(true)} class="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-xl hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/60 hover:scale-105 transition-all duration-300 font-semibold">Save & Print</button>
          {/if}
          <button on:click={() => { showAddForm = false; editingId = null; }} class="bg-gray-700 text-gray-300 px-8 py-3 rounded-xl hover:bg-gray-600 hover:scale-105 transition-all duration-300 font-semibold border border-gray-600">Cancel</button>
        </div>
      </div>
    </div>
    {/if}
  
  </div>
  