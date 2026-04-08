<script>
    import api from "$lib/api/axios";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import CityAutocomplete from "$lib/CityAutocomplete.svelte";
    import { tamilTransliterate } from "$lib/tamilTransliteration";
  
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
      paymentMode: "",
      transactionId: "",
      description: "",
      donationDate: new Date().toISOString().split('T')[0]
    };

    let editingEmailRow = null;
let customEmail = "";
let sending = false;

let tamilTyping = true;

function updateFormField(field, value) {
  formData = {
    ...formData,
    [field]: value
  };
}


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

  alert(error?.response?.data?.message || "Failed to send email. Please try again.");

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
    alert(error?.response?.data?.message || "Failed to send email");
  }
}
const handlePDF = async (id) => {

try {

  const res = await api.get(`/pdf-receipt/${id}`, {
    responseType: "blob"
  });

  const url = window.URL.createObjectURL(res.data);

  const link = document.createElement("a");
  link.href = url;
  link.download = `receipt-${id}.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

} catch (error) {
  let message = "Failed to download receipt";

  try {
    const errorBlob = error?.response?.data;

    if (errorBlob instanceof Blob) {
      const text = await errorBlob.text();
      try {
        const parsed = JSON.parse(text);
        message = parsed?.message || text || message;
      } catch {
        message = text || message;
      }
    } else if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.message) {
      message = error.message;
    }
  } catch {
    message = error?.message || message;
  }

  alert(message);
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
      paymentMode: "",
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
  fetchDonations();
  // 📊 Table data
});

  </script>
  
  <style>
    .field-label { font-size: 11px; font-weight: 600; color: #6e6e73; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; display: block; }
    .field-input { width: 100%; border: 1.5px solid #d1d1d6; border-radius: 10px; padding: 10px 14px; font-size: 15px; color: #1d1d1f; background: #fff; outline: none; transition: border-color 0.15s, box-shadow 0.15s; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .field-input:focus { border-color: #b91c1c; box-shadow: 0 0 0 3px rgba(185,28,28,0.12); }
.btn-add:hover { background: #991b1b !important; }
    .btn-cancel:hover { background: #f5f5f7 !important; }
    .btn-edit:hover { background: #fef3c7 !important; }
    .btn-print:hover { background: #dbeafe !important; }
    .btn-pdf:hover { background: #dcfce7 !important; }
    .btn-delete:hover { background: #ffe4e6 !important; }
    .btn-mail:hover { background: #e0e7ff !important; }
    .btn-mail2:hover { background: #f3e8ff !important; }
    .table-row:hover { background: #fff8f8 !important; }
  </style>

  <div class="min-h-screen" style="background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

    <!-- ── NAVBAR ── -->
    <header style="background:#fff; border-bottom:2px solid #b91c1c; position:sticky; top:0; z-index:40; box-shadow:0 2px 8px rgba(185,28,28,0.08);">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style="height:60px; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1771417669/SJC_app_logo-2-SJC_reciept_web_logo_5_nysuyc.png" alt="Logo" style="width:36px;height:36px;border-radius:8px;" />
          <div>
            <div style="font-size:15px;font-weight:700;color:#b91c1c;line-height:1.2;">St. John's Church Madathuvilai</div>
            <div class="hidden sm:block" style="font-size:12px;color:#6e6e73;">Donation Management System</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button
            on:click={() => { showAddForm = true; editingId = null; }}
            class="btn-add"
            style="display:inline-flex;align-items:center;gap:7px;background:#b91c1c;color:#fff;font-size:14px;font-weight:600;padding:9px 18px;border-radius:10px;border:none;cursor:pointer;transition:background 0.15s;box-shadow:0 1px 3px rgba(185,28,28,0.3);"
          >
            <i class="fas fa-plus" style="font-size:11px;"></i>
            <span class="hidden sm:inline">Add Donation</span>
            <span class="sm:hidden">Add</span>
          </button>
          <button
            on:click={handleLogout}
            style="display:inline-flex;align-items:center;gap:7px;background:#f5f5f7;color:#3a3a3c;font-size:14px;font-weight:600;padding:9px 16px;border-radius:10px;border:1.5px solid #d1d1d6;cursor:pointer;transition:background 0.15s;"
          >
            <i class="fas fa-sign-out-alt" style="font-size:11px;"></i>
            <span class="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ── MAIN ── -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7" style="display:flex;flex-direction:column;gap:20px;">

      <!-- Page heading -->
      <div>
        <h1 style="font-size:26px;font-weight:800;color:#b91c1c;margin:0 0 2px;">Dashboard</h1>
        <p style="font-size:14px;color:#6e6e73;margin:0;">132nd Asanam Thanksgiving Festival <span style="color:#b91c1c;">·</span> Donation Overview</p>
      </div>

      <!-- ── STAT CARDS ── -->
      {#if data}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <div style="background:#fff;border-radius:16px;padding:20px 22px;border:1px solid #e5e5ea;box-shadow:0 1px 4px rgba(0,0,0,0.06);display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:#fff1f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fas fa-coins" style="font-size:20px;color:#b91c1c;"></i>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Total Collected</div>
              <div style="font-size:26px;font-weight:800;color:#1d1d1f;line-height:1;">₹{data.totalAmount}</div>
            </div>
          </div>

          <div style="background:#fff;border-radius:16px;padding:20px 22px;border:1px solid #e5e5ea;box-shadow:0 1px 4px rgba(0,0,0,0.06);display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fas fa-calendar-day" style="font-size:20px;color:#16a34a;"></i>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Today's Collection</div>
              <div style="font-size:26px;font-weight:800;color:#1d1d1f;line-height:1;">₹{data.todayAmount}</div>
            </div>
          </div>

          <div style="background:#fff;border-radius:16px;padding:20px 22px;border:1px solid #e5e5ea;box-shadow:0 1px 4px rgba(0,0,0,0.06);display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:#f5f3ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fas fa-money-bill-wave" style="font-size:20px;color:#7c3aed;"></i>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Cash Collection</div>
              <div style="font-size:26px;font-weight:800;color:#1d1d1f;line-height:1;">₹{data.cashAmount}</div>
            </div>
          </div>

          <div style="background:#fff;border-radius:16px;padding:20px 22px;border:1px solid #e5e5ea;box-shadow:0 1px 4px rgba(0,0,0,0.06);display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:#eff6ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fas fa-mobile-alt" style="font-size:20px;color:#2563eb;"></i>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">UPI Collection</div>
              <div style="font-size:26px;font-weight:800;color:#1d1d1f;line-height:1;">₹{data.upiAmount}</div>
            </div>
          </div>

        </div>
      {/if}

      <!-- ── FILTER BAR ── -->
      <div style="background:#fff;border-radius:14px;border:1px solid #e5e5ea;box-shadow:0 1px 4px rgba(0,0,0,0.05);padding:14px 18px;">
        <div class="flex flex-wrap items-center gap-3">

          <!-- Search combo -->
          <div style="display:flex;flex:1;min-width:220px;border:1.5px solid #d1d1d6;border-radius:10px;overflow:hidden;background:#fff;" class="focus-within:ring-2 focus-within:ring-red-600/20">
            <select bind:value={searchType} style="font-size:13px;color:#3a3a3c;background:#f5f5f7;border-right:1.5px solid #d1d1d6;padding:10px 12px;outline:none;cursor:pointer;">
              <option value="name">Name</option>
              <option value="receipt">Receipt No</option>
            </select>
            <input
              type="text"
              placeholder={searchType === "name" ? "Search donor name..." : "Search receipt number..."}
              style="flex:1;font-size:14px;padding:10px 14px;outline:none;color:#1d1d1f;background:#fff;"
              on:input={(e) => handleSearch(e.target.value)}
            />
            <span style="padding:0 14px;display:flex;align-items:center;color:#8e8e93;"><i class="fas fa-search" style="font-size:13px;"></i></span>
          </div>

          <!-- Payment filter -->
          <select
            style="font-size:14px;color:#3a3a3c;border:1.5px solid #d1d1d6;border-radius:10px;padding:10px 14px;background:#fff;outline:none;cursor:pointer;"
            on:change={(e) => fetchDonations({ paymentMode: e.target.value })}
          >
            <option value="">All Payments</option>
            <option value="HAND">Cash</option>
            <option value="UPI">UPI</option>
          </select>

          <!-- Sort filter -->
          <select
            style="font-size:14px;color:#3a3a3c;border:1.5px solid #d1d1d6;border-radius:10px;padding:10px 14px;background:#fff;outline:none;cursor:pointer;"
            on:change={(e) => {
              const value = e.target.value;
              if (!value) return fetchDonations();
              const [sortBy, order] = value.split("-");
              fetchDonations({ sortBy, order });
            }}
          >
            <option value="">Sort: Default</option>
            <option value="donated_amount-desc">Amount: High → Low</option>
            <option value="donated_amount-asc">Amount: Low → High</option>
            <option value="donationDate-desc">Date: Latest First</option>
            <option value="donationDate-asc">Date: Oldest First</option>
          </select>

          <button
            on:click={handleExport}
            style="margin-left:auto;display:inline-flex;align-items:center;gap:8px;background:#15803d;color:#fff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:10px;border:none;cursor:pointer;box-shadow:0 1px 3px rgba(21,128,61,0.3);transition:background 0.15s;"
          >
            <i class="fas fa-file-excel" style="font-size:12px;"></i>
            <span class="hidden sm:inline">Export to Excel</span>
            <span class="sm:hidden">Export</span>
          </button>

        </div>
      </div>

      <!-- ── DONATIONS TABLE ── -->
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e5ea;box-shadow:0 1px 4px rgba(0,0,0,0.06);overflow:hidden;">

        <!-- Table toolbar -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f2f2f7;">
          <div style="font-size:16px;font-weight:700;color:#1d1d1f;border-left:3px solid #b91c1c;padding-left:10px;">Donation Records</div>
          {#if donations.length > 0}
            <div style="font-size:13px;color:#6e6e73;background:#f5f5f7;padding:4px 12px;border-radius:20px;border:1px solid #e5e5ea;">{donations.length} records</div>
          {/if}
        </div>

        {#if loading}
          <div style="display:flex;align-items:center;justify-content:center;padding:64px 0;gap:12px;color:#8e8e93;">
            <i class="fas fa-spinner fa-spin" style="font-size:20px;color:#b91c1c;"></i>
            <span style="font-size:15px;">Loading donations...</span>
          </div>
        {:else if donations.length === 0}
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:72px 0;color:#8e8e93;gap:10px;">
            <i class="fas fa-inbox" style="font-size:40px;color:#d1d1d6;"></i>
            <div style="font-size:16px;font-weight:600;color:#3a3a3c;">No donations found</div>
            <div style="font-size:14px;color:#8e8e93;">Try adjusting your search or filters</div>
          </div>
        {:else}
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f5f5f7;border-bottom:1px solid #e5e5ea;">
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.06em;width:44px;">#</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.06em;">Name</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.06em;">Amount</th>
                  <th class="hidden md:table-cell" style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.06em;">Receipt No.</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.06em;">Payment</th>
                  <th class="hidden sm:table-cell" style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.06em;">Date</th>
                  <th style="padding:12px 16px;text-align:center;font-size:11px;font-weight:700;color:#6e6e73;text-transform:uppercase;letter-spacing:0.06em;">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each donations as donation, i}
                  <tr class="table-row" style="border-bottom:1px solid #f2f2f7;transition:background 0.1s;{i % 2 !== 0 ? 'background:#fafafa;' : 'background:#fff;'}">
                    <td style="padding:14px 16px;font-size:13px;color:#c7c7cc;font-variant-numeric:tabular-nums;">{i + 1}</td>
                    <td style="padding:14px 16px;font-size:15px;font-weight:600;color:#1d1d1f;">{donation.name}</td>
                    <td style="padding:14px 16px;font-size:15px;font-weight:700;color:#b91c1c;">₹{donation.donated_amount}</td>
                    <td class="hidden md:table-cell" style="padding:14px 16px;">
                      <span style="font-family:'SF Mono',ui-monospace,monospace;font-size:12px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;padding:3px 8px;border-radius:6px;">{donation.receiptNumber}</span>
                    </td>
                    <td style="padding:14px 16px;">
                      {#if donation.paymentMode === 'UPI'}
                        <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;padding:4px 10px;border-radius:20px;">
                          <i class="fas fa-mobile-alt" style="font-size:10px;"></i> UPI
                        </span>
                      {:else}
                        <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:4px 10px;border-radius:20px;">
                          <i class="fas fa-money-bill" style="font-size:10px;"></i> Cash
                        </span>
                      {/if}
                    </td>
                    <td class="hidden sm:table-cell" style="padding:14px 16px;font-size:14px;color:#6e6e73;">{new Date(donation.donationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style="padding:10px 16px;">
                      <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">

                        <button title="Edit donation" on:click={() => { handleEdit(donation); }}
                          class="btn-edit"
                          style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;background:#fffbeb;color:#b45309;border:1.5px solid #fde68a;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.12s;white-space:nowrap;"
                        ><i class="fas fa-pencil" style="font-size:11px;"></i> Edit</button>

                        <button title="Print receipt" on:click={() => handlePrint(donation._id)}
                          class="btn-print"
                          style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;background:#eff6ff;color:#2563eb;border:1.5px solid #bfdbfe;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.12s;white-space:nowrap;"
                        ><i class="fas fa-receipt" style="font-size:11px;"></i> Print</button>

                        <button title="Download PDF" on:click={() => handlePDF(donation._id)}
                          class="btn-pdf"
                          style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.12s;white-space:nowrap;"
                        ><i class="fas fa-file-arrow-down" style="font-size:11px;"></i> PDF</button>

                        <button title="Mail receipt to donor" on:click={() => sendEmail(donation._id)}
                          class="btn-mail"
                          style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;background:#eef2ff;color:#4338ca;border:1.5px solid #c7d2fe;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.12s;white-space:nowrap;"
                        ><i class="fas fa-paper-plane" style="font-size:11px;"></i> Mail</button>

                        {#if editingEmailRow === donation._id}
                          <input
                            type="email"
                            placeholder="Enter email..."
                            bind:value={customEmail}
                            style="font-size:13px;border:1.5px solid #d1d1d6;border-radius:8px;padding:6px 12px;outline:none;width:160px;color:#1d1d1f;"
                          />
                          <button title="Send" disabled={sending} on:click={() => sendCustomEmail(donation._id)}
                            style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;background:#16a34a;color:#fff;border:none;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
                            {#if sending}
                              <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" opacity="0.3"/>
                                <path d="M22 12a10 10 0 00-10-10" stroke="white" stroke-width="4"/>
                              </svg>
                              Sending...
                            {:else}
                              <i class="fas fa-paper-plane" style="font-size:11px;"></i> Send
                            {/if}
                          </button>
                          <button title="Cancel" on:click={() => { editingEmailRow = null; customEmail = ""; }}
                            style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;background:#f5f5f7;color:#3a3a3c;border:1.5px solid #d1d1d6;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
                            <i class="fas fa-xmark" style="font-size:11px;"></i> Cancel
                          </button>
                        {:else}
                          <button title="Send receipt to custom email" on:click={() => editingEmailRow = donation._id}
                            class="btn-mail2"
                            style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;background:#faf5ff;color:#7c3aed;border:1.5px solid #ddd6fe;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.12s;white-space:nowrap;"
                          ><i class="fas fa-share-nodes" style="font-size:11px;"></i> Forward</button>
                        {/if}

                        <button title="Delete donation" on:click={() => handleDelete(donation._id)}
                          class="btn-delete"
                          style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;background:#fff1f2;color:#e11d48;border:1.5px solid #fecdd3;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.12s;white-space:nowrap;"
                        ><i class="fas fa-trash-can" style="font-size:11px;"></i> Delete</button>

                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

    </main>

    <!-- ── ADD / EDIT MODAL ── -->
    {#if showAddForm}
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px;">
      <div style="background:#fff;border-radius:20px;box-shadow:0 24px 64px rgba(0,0,0,0.18);width:100%;max-width:640px;max-height:92vh;overflow-y:auto;border:1px solid #e5e5ea;">

        <!-- Modal header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #f2f2f7;">
          <div>
            <div style="font-size:18px;font-weight:700;color:#1d1d1f;">{editingId ? 'Edit Donation' : 'New Donation'}</div>
            <div style="font-size:13px;color:#8e8e93;margin-top:2px;">{editingId ? 'Update the donation details' : 'Record a new donation entry'}</div>
          </div>
          <button title="Close" on:click={() => { showAddForm = false; editingId = null; }}
            style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#f5f5f7;border:none;color:#6e6e73;cursor:pointer;font-size:13px;">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Tamil toggle -->
        <div style="padding:14px 24px 0;border-bottom:1px solid #f2f2f7;padding-bottom:14px;">
          <label style="display:inline-flex;align-items:center;gap:10px;cursor:pointer;">
            <input type="checkbox" bind:checked={tamilTyping} style="width:16px;height:16px;accent-color:#b91c1c;" />
            <span style="font-size:14px;font-weight:600;color:#3a3a3c;">Tamil Phonetic Typing</span>
            <span style="font-size:13px;color:#8e8e93;">— type English, get Tamil script</span>
          </label>
        </div>

        <!-- Form -->
        <div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:16px;" class="sm:grid-cols-2 grid-cols-1">
          <div>
            <label class="field-label">Donor Name *</label>
            <input id="donorName" bind:value={formData.name}
              use:tamilTransliterate={{ enabled: tamilTyping, onChange: (value) => updateFormField("name", value) }}
              class="field-input" style="width:100%;box-sizing:border-box;" />
          </div>
          <div>
            <label class="field-label">Amount (₹) *</label>
            <div style="position:relative;">
              <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#8e8e93;font-size:15px;font-weight:600;">₹</span>
              <input type="number" bind:value={formData.donated_amount} required
                class="field-input" style="padding-left:28px;width:100%;box-sizing:border-box;" />
            </div>
          </div>
          <div style="grid-column:1/-1;">
            <label class="field-label">Address (City / Town) *</label>
            <CityAutocomplete bind:value={formData.address} placeholder="Start typing city name..." required tamilTyping={tamilTyping} />
          </div>
          <div>
            <label class="field-label">Phone</label>
            <input bind:value={formData.phone} class="field-input" style="width:100%;box-sizing:border-box;" />
          </div>
          <div>
            <label class="field-label">Email</label>
            <input type="email" bind:value={formData.email} class="field-input" style="width:100%;box-sizing:border-box;" />
          </div>
          <div>
            <label class="field-label">Payment Mode *</label>
            <select bind:value={formData.paymentMode} class="field-input" style="width:100%;box-sizing:border-box;cursor:pointer;">
              <option value="HAND">Cash</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div>
            <label class="field-label">Donation Date *</label>
            <input type="date" bind:value={formData.donationDate} required class="field-input" style="width:100%;box-sizing:border-box;" />
          </div>
          {#if formData.paymentMode === "UPI"}
          <div style="grid-column:1/-1;">
            <label class="field-label">Transaction ID</label>
            <input bind:value={formData.transactionId} class="field-input" style="width:100%;box-sizing:border-box;" />
          </div>
          {/if}
          <div style="grid-column:1/-1;">
            <label class="field-label">Description</label>
            <textarea id="donorDescription" bind:value={formData.description} rows="2"
              use:tamilTransliterate={{ enabled: tamilTyping, onChange: (value) => updateFormField("description", value) }}
              class="field-input" style="width:100%;box-sizing:border-box;resize:none;"></textarea>
          </div>
        </div>

        <!-- Modal footer -->
        <div style="display:flex;align-items:center;gap:10px;padding:16px 24px;border-top:1px solid #f2f2f7;background:#fafafa;border-radius:0 0 20px 20px;">
          <button on:click={() => handleAddDonation(false)}
            style="background:#b91c1c;color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:10px;border:none;cursor:pointer;box-shadow:0 1px 3px rgba(185,28,28,0.3);transition:background 0.15s;">
            {editingId ? 'Update Donation' : 'Save Donation'}
          </button>
          {#if !editingId}
          <button on:click={() => handleAddDonation(true)}
            style="background:#15803d;color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:10px;border:none;cursor:pointer;box-shadow:0 1px 3px rgba(21,128,61,0.25);transition:background 0.15s;">
            Save &amp; Print
          </button>
          {/if}
          <button on:click={() => { showAddForm = false; editingId = null; }}
            class="btn-cancel"
            style="margin-left:auto;font-size:14px;font-weight:600;color:#6e6e73;background:transparent;border:none;cursor:pointer;padding:11px 16px;border-radius:10px;transition:background 0.15s;">
            Cancel
          </button>
        </div>

      </div>
    </div>
    {/if}

  </div>
  
