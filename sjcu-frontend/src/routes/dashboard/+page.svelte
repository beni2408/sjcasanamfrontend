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
    let activeSortBy = "";
    let activeSortOrder = "desc";
    let debounceTimer;
    let donations = [];
    let currentFilters = {};
    let showAddForm = false;
    let showEditForm = false;
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
      purpose: "",
      donationDate: new Date().toISOString().split('T')[0],
      donorType: "LOCAL"
    };

    let editingEmailRow = null;
let customEmail = "";
let sending = false;

let showAddPurpose = false;
let showEditPurpose = false;

// ── TOAST SYSTEM ──
let toasts = [];
let toastCounter = 0;
function showToast(message, type = "info") {
  const id = ++toastCounter;
  toasts = [...toasts, { id, message, type }];
  setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 3500);
}

// ── CONFIRM MODAL ──
let confirmModal = { show: false, message: "", onConfirm: null };
function showConfirm(message, onConfirm) {
  confirmModal = { show: true, message, onConfirm };
}
function closeConfirm() {
  confirmModal = { show: false, message: "", onConfirm: null };
}

let tamilTyping = true;

// ── Advanced filter state ──
let showFilters = false;
let checkboxPayment = { HAND: false, UPI: false };
let checkboxDonorType = { LOCAL: false, OUTSTATION: false };
let filterMinAmount = "";
let filterMaxAmount = "";
let filterDateFrom = "";
let filterDateTo = "";
let checkboxPurpose = { none: false, with: false };

$: activeFilterCount = [
  Object.values(checkboxPayment).filter(Boolean).length === 1 ? 1 : 0,
  Object.values(checkboxDonorType).filter(Boolean).length === 1 ? 1 : 0,
  filterMinAmount || filterMaxAmount ? 1 : 0,
  filterDateFrom || filterDateTo ? 1 : 0,
  Object.values(checkboxPurpose).filter(Boolean).length === 1 ? 1 : 0
].reduce((a, b) => a + b, 0);

function buildAllFilters() {
  const params = {};
  if (search) {
    if (searchType === "name") params.name = search;
    else params.receiptNumber = search;
  }
  const selPay = Object.entries(checkboxPayment).filter(([,v]) => v).map(([k]) => k);
  if (selPay.length === 1) params.paymentMode = selPay[0];
  const selType = Object.entries(checkboxDonorType).filter(([,v]) => v).map(([k]) => k);
  if (selType.length === 1) params.donorType = selType[0];
  const selPurpose = Object.entries(checkboxPurpose).filter(([,v]) => v).map(([k]) => k);
  if (selPurpose.length === 1) params.purposeType = selPurpose[0];
  if (filterMinAmount) params.minAmount = filterMinAmount;
  if (filterMaxAmount) params.maxAmount = filterMaxAmount;
  if (filterDateFrom) params.dateFrom = filterDateFrom;
  if (filterDateTo) params.dateTo = filterDateTo;
  if (activeSortBy) { params.sortBy = activeSortBy; params.order = activeSortOrder; }
  return params;
}

function clearFilters() {
  checkboxPayment = { HAND: false, UPI: false };
  checkboxDonorType = { LOCAL: false, OUTSTATION: false };
  filterMinAmount = "";
  filterMaxAmount = "";
  filterDateFrom = "";
  filterDateTo = "";
  checkboxPurpose = { none: false, with: false };
  fetchDonations(buildAllFilters());
}

let showDeletedReceipts = false;
let deletedReceipts = [];
let loadingDeleted = false;

const fetchDeletedReceipts = async () => {
  loadingDeleted = true;
  try {
    const res = await api.get("/donations/deleted-receipts");
    deletedReceipts = res.data;
  } catch (err) {
    showToast("Failed to load deleted receipts", "error");
  } finally {
    loadingDeleted = false;
  }
};

function resetFormData() {
  formData = {
    name: "",
    address: "",
    phone: "",
    email: "",
    donated_amount: "",
    paymentMode: "",
    transactionId: "",
    description: "",
    purpose: "",
    donationDate: new Date().toISOString().split('T')[0],
    donorType: "LOCAL"
  };
  showAddPurpose = false;
  showEditPurpose = false;
}

function updateFormField(field, value) {
  formData = {
    ...formData,
    [field]: value
  };
}


async function sendCustomEmail(id) {

if (!customEmail) {
  showToast("Please enter an email address.", "error");
  return;
}

if (!validateEmail(customEmail)) {
  showToast("Please enter a valid email address.", "error");
  return;
}

try {

  sending = true;

  await api.post(`/send-custom-email/${id}`, {
    email: customEmail
  });

  showToast("Receipt sent successfully!", "success");

  editingEmailRow = null;
  customEmail = "";

} catch (error) {

  showToast(error?.response?.data?.message || "Failed to send email. Please try again.", "error");

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
      try {
        const res = await api.get("/dashboard", {
          params: filters,
        });
        data = res.data;
      } catch (err) {
        if (err?.response?.status === 401) {
          localStorage.removeItem("token");
          goto("/");
        } else {
          console.error("Failed to fetch dashboard:", err);
        }
      } finally {
        loading = false;
      }
    };
  
    onMount(() => {
      fetchDashboard();
    });
  
    const handleSearch = (value) => {
  search = value;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchDonations(buildAllFilters());
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
  showToast("Failed to print receipt", "error");
}
};



async function sendEmail(id) {
  try {
    await api.post(`/send-email/${id}`);

    showToast("Email request sent successfully", "success");
  } catch (error) {
    showToast(error?.response?.data?.message || "Failed to send email", "error");
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

  showToast(message, "error");
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
    showToast("Failed to export data", "error");
  }
};

const handleAddDonation = async (printAfter = false) => {
  try {

    const payload = {
      ...formData,
      paymentmethod: formData.paymentMode,
      purpose: (editingId ? showEditPurpose : showAddPurpose) && formData.purpose && formData.purpose.trim()
        ? formData.purpose.trim()
        : "-"
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
          showToast("Donation saved! Please wait a moment and print from the table.", "info");
        }
      }
    }

    showAddForm = false;
    showEditForm = false;
    showAddPurpose = false;
    showEditPurpose = false;

    formData = {
      name: "",
      address: "",
      phone: "",
      email: "",
      donated_amount: "",
      paymentMode: "",
      transactionId: "",
      description: "",
      purpose: "",
      donationDate: new Date().toISOString().split('T')[0],
      donorType: "LOCAL"
    };

    await fetchDashboard();
    await fetchDonations();

  } catch (error) {
    console.error("Save error:", error);
    showToast("Failed to save donation", "error");
  }
};

const handleEdit = (donation) => {
  editingId = donation._id;

  const editPurposeValue = donation.purpose && donation.purpose !== "-" ? donation.purpose : "";
  showEditPurpose = !!editPurposeValue;

  formData = {
    name: donation.name,
    address: donation.address,
    phone: donation.phone || "",
    email: donation.email || "",
    donated_amount: donation.donated_amount,
    paymentMode: donation.paymentMode,
    transactionId: donation.transactionId || "",
    description: donation.description || "",
    purpose: editPurposeValue,
    receiptNumber: donation.receiptNumber,   // ⭐⭐⭐⭐⭐ FIX
    donationDate: new Date(donation.donationDate)
      .toISOString()
      .split('T')[0],
    donorType: donation.donorType || "LOCAL"
  };

  showEditForm = true;
};
const handleDelete = async (id) => {
  showConfirm("Are you sure you want to delete this donation? This action cannot be undone.", async () => {
    try {
      await api.delete(`/donations/${id}`);
      fetchDashboard();
      fetchDonations();
      showToast("Donation deleted successfully!", "success");
    } catch (error) {
      showToast("Failed to delete donation", "error");
    }
  });
};


    const handleLogout = () => {
      localStorage.removeItem("token");
      goto("/");
    };

    const fetchDonations = async (filters = {}) => {

loading = true;
currentFilters = filters;

try {
  const res = await api.get("/donations", {
    params: filters
  });
  donations = res.data;
} catch (err) {
  if (err?.response?.status === 401) {
    localStorage.removeItem("token");
    goto("/");
  } else {
    console.error("Failed to fetch donations:", err);
    donations = [];
  }
} finally {
  loading = false;
}
};

onMount(() => {
  fetchDashboard();   // 💰 Summary cards
  fetchDonations();
  // 📊 Table data
});

  </script>
  
  <style>
    /* ── Animations ── */
    @keyframes hero-pulse {
      0%, 100% { box-shadow: 0 0 6px 0 rgba(34,197,94,0.8); opacity: 1; }
      50% { box-shadow: 0 0 16px 4px rgba(34,197,94,0.9); opacity: 0.7; }
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateX(40px) scale(0.95); }
      to   { opacity: 1; transform: translateX(0)    scale(1); }
    }

    /* ── Base typography ── */
    * { box-sizing: border-box; }

    /* ── Form fields ── */
    .field-label { font-size: 11.5px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 7px; display: block; }
    .field-input { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 11px 14px; font-size: 14px; color: #111827; background: #f9fafb; outline: none; transition: all 0.2s; font-family: inherit; }
    .field-input:focus { border-color: #b91c1c; background: #fff; box-shadow: 0 0 0 4px rgba(185,28,28,0.1); }

    /* ── Navbar ── */
    .nav-add-btn { background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%); transition: all 0.2s; box-shadow: 0 2px 10px rgba(185,28,28,0.4); }
    .nav-add-btn:hover { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); box-shadow: 0 4px 16px rgba(185,28,28,0.5); transform: translateY(-1px); }
    .nav-logout-btn { transition: all 0.2s; }
    .nav-logout-btn:hover { background: #f9fafb !important; border-color: #b91c1c !important; color: #b91c1c !important; }


    /* ── Filter bar ── */
    .filter-select { font-size: 14px; color: #374151; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; background: #fff; outline: none; cursor: pointer; transition: border-color 0.2s; font-family: inherit; }
    .filter-select:focus { border-color: #b91c1c; box-shadow: 0 0 0 3px rgba(185,28,28,0.08); }
    .search-wrap { display: flex; flex: 1; min-width: 220px; border: 1.5px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; }
    .search-wrap:focus-within { border-color: #b91c1c; box-shadow: 0 0 0 3px rgba(185,28,28,0.08); }
    .export-btn { background: linear-gradient(135deg, #14532d 0%, #15803d 100%); transition: all 0.2s; box-shadow: 0 2px 10px rgba(21,128,61,0.4); }
    .export-btn:hover { background: linear-gradient(135deg, #052e16 0%, #14532d 100%); box-shadow: 0 4px 16px rgba(21,128,61,0.5); transform: translateY(-1px); }

    /* ── Table ── */
    .table-row { transition: background 0.1s; }
    .table-row:hover { background: #fef9f9 !important; }
    .receipt-badge { font-family: 'SF Mono', ui-monospace, monospace; font-size: 11.5px; background: #fffbeb; color: #92400e; border: 1px solid #fde68a; padding: 4px 9px; border-radius: 7px; font-weight: 600; letter-spacing: 0.02em; }
    .payment-upi { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: #1d4ed8; background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 1px solid #bfdbfe; padding: 4px 11px; border-radius: 20px; }
    .payment-cash { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: #15803d; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; padding: 4px 11px; border-radius: 20px; }

    /* ── Action buttons ── */
    .btn-edit { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 8px; background: #fffbeb; color: #b45309; border: 1.5px solid #fde68a; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; white-space: nowrap; }
    .btn-edit:hover { background: #fef3c7; border-color: #fbbf24; transform: translateY(-1px); }
    .btn-print { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 8px; background: #eff6ff; color: #2563eb; border: 1.5px solid #bfdbfe; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; white-space: nowrap; }
    .btn-print:hover { background: #dbeafe; border-color: #93c5fd; transform: translateY(-1px); }
    .btn-pdf { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 8px; background: #f0fdf4; color: #16a34a; border: 1.5px solid #bbf7d0; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; white-space: nowrap; }
    .btn-pdf:hover { background: #dcfce7; border-color: #6ee7b7; transform: translateY(-1px); }
    .btn-mail { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 8px; background: #eef2ff; color: #4338ca; border: 1.5px solid #c7d2fe; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; white-space: nowrap; }
    .btn-mail:hover { background: #e0e7ff; border-color: #a5b4fc; transform: translateY(-1px); }
    .btn-mail2 { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 8px; background: #faf5ff; color: #7c3aed; border: 1.5px solid #ddd6fe; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; white-space: nowrap; }
    .btn-mail2:hover { background: #f3e8ff; border-color: #c4b5fd; transform: translateY(-1px); }
    .btn-delete { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 8px; background: #fff1f2; color: #e11d48; border: 1.5px solid #fecdd3; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; white-space: nowrap; }
    .btn-delete:hover { background: #ffe4e6; border-color: #fda4af; transform: translateY(-1px); }

    /* ── Modals ── */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
    .modal-box { background: #fff; border-radius: 22px; box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 8px 20px rgba(0,0,0,0.1); width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 22px 26px; border-bottom: 1px solid #f3f4f6; }
    .modal-header-add { background: linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%); border-radius: 22px 22px 0 0; }
    .modal-header-edit { background: linear-gradient(135deg, #78350f 0%, #b45309 100%); border-radius: 22px 22px 0 0; }
    .modal-body { padding: 22px 26px; display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .modal-footer { display: flex; align-items: center; gap: 10px; padding: 18px 26px; border-top: 1px solid #f3f4f6; background: #fafafa; border-radius: 0 0 22px 22px; }
    .modal-close-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 9px; background: rgba(255,255,255,0.2); border: none; color: #fff; cursor: pointer; font-size: 14px; transition: background 0.15s; }
    .modal-close-btn:hover { background: rgba(255,255,255,0.3); }
    .btn-save { background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%); color: #fff; font-size: 14px; font-weight: 700; padding: 12px 26px; border-radius: 10px; border: none; cursor: pointer; box-shadow: 0 2px 10px rgba(185,28,28,0.4); transition: all 0.2s; }
    .btn-save:hover { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(185,28,28,0.5); }
    .btn-save-print { background: linear-gradient(135deg, #14532d 0%, #15803d 100%); color: #fff; font-size: 14px; font-weight: 700; padding: 12px 26px; border-radius: 10px; border: none; cursor: pointer; box-shadow: 0 2px 10px rgba(21,128,61,0.4); transition: all 0.2s; }
    .btn-save-print:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(21,128,61,0.5); }
    .btn-update { background: linear-gradient(135deg, #78350f 0%, #b45309 100%); color: #fff; font-size: 14px; font-weight: 700; padding: 12px 26px; border-radius: 10px; border: none; cursor: pointer; box-shadow: 0 2px 10px rgba(180,83,9,0.4); transition: all 0.2s; }
    .btn-update:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(180,83,9,0.5); }
    .btn-cancel { font-size: 14px; font-weight: 600; color: #6b7280; background: transparent; border: 1.5px solid #e5e7eb; cursor: pointer; padding: 11px 20px; border-radius: 10px; transition: all 0.2s; margin-left: auto; }
    .btn-cancel:hover { background: #f9fafb; border-color: #d1d5db; color: #374151; }
    .btn-deleted { background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%); transition: all 0.2s; box-shadow: 0 2px 10px rgba(55,48,163,0.4); }
    .btn-deleted:hover { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); box-shadow: 0 4px 16px rgba(55,48,163,0.5); transform: translateY(-1px); }
  </style>

  <div style="min-height:100vh;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Inter','SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

    <!-- ── NAVBAR ── -->
    <header style="position:sticky;top:0;z-index:40;">
      <!-- Gradient accent strip -->
      <div style="height:3px;background:linear-gradient(90deg,#7f1d1d,#b91c1c,#dc2626,#b91c1c,#7f1d1d);"></div>
      <div style="background:#fff;box-shadow:0 1px 0 #f3f4f6,0 4px 16px rgba(0,0,0,0.06);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style="height:62px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:14px;">
            <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1775385349/SJC_app_logo-2-SJC_reciept_web_logo_6_gvhpza.png" alt="Logo"
                 style="width:38px;height:38px;border-radius:10px;box-shadow:0 2px 8px rgba(185,28,28,0.25);" />
            <div>
              <div style="font-size:15px;font-weight:800;color:#111827;line-height:1.2;letter-spacing:-0.2px;">St. John's Church <span style="color:#b91c1c;">Madathuvilai</span></div>
              <div class="hidden sm:block" style="font-size:11px;font-weight:500;color:#9ca3af;letter-spacing:0.03em;text-transform:uppercase;">Donation Management System</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button on:click={() => { showAddForm = true; editingId = null; }} class="nav-add-btn"
              style="display:inline-flex;align-items:center;gap:8px;color:#fff;font-size:14px;font-weight:700;padding:9px 20px;border-radius:10px;border:none;cursor:pointer;letter-spacing:0.01em;">
              <i class="fas fa-plus" style="font-size:11px;"></i>
              <span class="hidden sm:inline">Add Donation</span>
              <span class="sm:hidden">Add</span>
            </button>
            <button on:click={handleLogout} class="nav-logout-btn"
              style="display:inline-flex;align-items:center;gap:8px;background:#fff;color:#4b5563;font-size:14px;font-weight:600;padding:9px 18px;border-radius:10px;border:1.5px solid #e5e7eb;cursor:pointer;">
              <i class="fas fa-right-from-bracket" style="font-size:12px;"></i>
              <span class="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- ── MAIN ── -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style="padding-top:28px;padding-bottom:32px;display:flex;flex-direction:column;gap:22px;">

      <!-- ── HERO BANNER ── -->
      <div style="position:relative;border-radius:26px;overflow:hidden;box-shadow:0 20px 60px rgba(127,29,29,0.5),0 6px 20px rgba(0,0,0,0.2);">

        <!-- Multi-layer gradient background -->
        <div style="position:absolute;inset:0;background:linear-gradient(145deg,#1a0202 0%,#450a0a 20%,#7f1d1d 45%,#991b1b 65%,#b91c1c 85%,#dc2626 100%);"></div>
        <!-- Radial glow in center -->
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(220,38,38,0.3),transparent 70%);"></div>
        <!-- Dot grid -->
        <div style="position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px);background-size:24px 24px;"></div>

        <!-- Giant cross watermark -->
        <div style="position:absolute;right:-20px;top:50%;transform:translateY(-50%);font-size:280px;color:rgba(255,255,255,0.04);line-height:1;pointer-events:none;user-select:none;">✝</div>

        <!-- Logo watermark -->
        <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1775385349/SJC_app_logo-2-SJC_reciept_web_logo_6_gvhpza.png" alt=""
             style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:320px;height:320px;object-fit:contain;opacity:0.13;pointer-events:none;user-select:none;" />

        <!-- Decorative orbs -->
        <div style="position:absolute;top:-80px;left:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(255,100,100,0.12),transparent 70%);pointer-events:none;"></div>
        <div style="position:absolute;bottom:-60px;right:300px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.06),transparent 70%);pointer-events:none;"></div>

        <!-- ── MAIN CONTENT ── -->
        <div style="position:relative;z-index:2;padding:36px 40px 28px;">

          <!-- Top row: Logo + church name + badges -->
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:28px;">

            <div style="display:flex;align-items:center;gap:16px;">
              <!-- Logo with glowing ring -->
              <div style="position:relative;flex-shrink:0;">
                <div style="position:absolute;inset:-4px;border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0.1));"></div>
                <img src="https://res.cloudinary.com/dusji1fg2/image/upload/v1775385349/SJC_app_logo-2-SJC_reciept_web_logo_6_gvhpza.png" alt="SJC Logo"
                     style="position:relative;width:62px;height:62px;border-radius:18px;box-shadow:0 8px 24px rgba(0,0,0,0.4);" />
              </div>
              <div>
                <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:0.14em;text-transform:uppercase;">St. John's Church · Madathuvilai</div>
                <div style="font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.3px;margin-top:2px;">Paribalana Committee</div>
              </div>
            </div>

            <!-- Badges -->
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <div style="display:inline-flex;align-items:center;gap:7px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.35);border-radius:20px;padding:6px 14px;">
                <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 10px rgba(34,197,94,1);display:inline-block;animation:hero-pulse 2s ease-in-out infinite;"></span>
                <span style="font-size:12px;font-weight:700;color:#86efac;letter-spacing:0.06em;text-transform:uppercase;">Live</span>
              </div>
              <div style="display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);border-radius:20px;padding:6px 14px;backdrop-filter:blur(6px);">
                <i class="fas fa-calendar-days" style="font-size:11px;color:rgba(255,255,255,0.6);"></i>
                <span style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.85);">{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</span>
              </div>
            </div>

          </div>

          <!-- Centre: Festival title + BIG total amount -->
          <div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:24px;">

            <!-- Left: Title -->
            <div>
              <div style="font-size:13px;font-weight:700;color:rgba(255,200,200,0.7);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">
                <i class="fas fa-star" style="font-size:10px;margin-right:4px;color:#fca5a5;"></i>
                132<sup style="font-size:9px;">nd</sup> Annual Celebration
              </div>
              <h1 style="font-size:34px;font-weight:900;color:#fff;margin:0;line-height:1.1;letter-spacing:-1px;">
                Asanam <span style="background:linear-gradient(90deg,#fca5a5,#fb7185);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Thanksgiving</span><br/>Festival
              </h1>
            </div>

            <!-- Right: Featured total -->
            <div style="background:rgba(255,255,255,0.1);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:20px 28px;text-align:right;min-width:200px;">
              <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">
                <i class="fas fa-indian-rupee-sign" style="font-size:9px;margin-right:3px;"></i>Total Collected
              </div>
              <div style="font-size:42px;font-weight:900;color:#fff;line-height:1;letter-spacing:-2px;">
                {#if data}₹{data.totalAmount}{:else}<span style="font-size:28px;opacity:0.4;">—</span>{/if}
              </div>
              <div style="margin-top:8px;font-size:12px;color:rgba(255,255,255,0.5);">{donations.length} donations recorded</div>
            </div>

          </div>

        </div>

        <!-- ── STAT TILES (merged) ── -->
        <div style="position:relative;z-index:2;border-top:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.22);backdrop-filter:blur(8px);display:grid;grid-template-columns:repeat(4,1fr);">

          <!-- Total Collected -->
          <div style="padding:22px 28px;border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.1em;">Total Collected</span>
              <div style="width:32px;height:32px;border-radius:9px;background:rgba(254,202,202,0.15);display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-coins" style="font-size:13px;color:#fca5a5;"></i>
              </div>
            </div>
            <div style="font-size:28px;font-weight:900;color:#fff;line-height:1;letter-spacing:-1px;">{data ? '₹'+data.totalAmount : '—'}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:500;">All time donations</div>
          </div>

          <!-- Today's Collection -->
          <div style="padding:22px 28px;border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.1em;">Today</span>
              <div style="width:32px;height:32px;border-radius:9px;background:rgba(134,239,172,0.15);display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-calendar-day" style="font-size:13px;color:#86efac;"></i>
              </div>
            </div>
            <div style="font-size:28px;font-weight:900;color:#fff;line-height:1;letter-spacing:-1px;">{data ? '₹'+data.todayAmount : '—'}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:500;">Today's collection</div>
          </div>

          <!-- Cash -->
          <div style="padding:22px 28px;border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.1em;">Cash</span>
              <div style="width:32px;height:32px;border-radius:9px;background:rgba(196,181,253,0.15);display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-money-bill-wave" style="font-size:13px;color:#c4b5fd;"></i>
              </div>
            </div>
            <div style="font-size:28px;font-weight:900;color:#fff;line-height:1;letter-spacing:-1px;">{data ? '₹'+data.cashAmount : '—'}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:500;">Hand cash received</div>
          </div>

          <!-- UPI -->
          <div style="padding:22px 28px;display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.1em;">UPI</span>
              <div style="width:32px;height:32px;border-radius:9px;background:rgba(147,197,253,0.15);display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-mobile-screen-button" style="font-size:13px;color:#93c5fd;"></i>
              </div>
            </div>
            <div style="font-size:28px;font-weight:900;color:#fff;line-height:1;letter-spacing:-1px;">{data ? '₹'+data.upiAmount : '—'}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:500;">Digital payments</div>
          </div>

        </div>

      </div>

      <!-- ── FILTER BAR ── -->
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 1px 6px rgba(0,0,0,0.05);overflow:hidden;">

        <!-- Top row -->
        <div class="flex flex-wrap items-center gap-3" style="padding:16px 20px;">

          <!-- Search combo -->
          <div class="search-wrap">
            <select bind:value={searchType} style="font-size:13px;color:#374151;background:#f9fafb;border-right:1.5px solid #e5e7eb;padding:10px 12px;outline:none;cursor:pointer;font-weight:600;">
              <option value="name">Name</option>
              <option value="receipt">Receipt No</option>
            </select>
            <input type="text"
              placeholder={searchType === "name" ? "Search donor name..." : "Search receipt number..."}
              style="flex:1;font-size:14px;padding:10px 14px;outline:none;color:#111827;background:#fff;border:none;"
              on:input={(e) => handleSearch(e.target.value)}
            />
            <span style="padding:0 14px;display:flex;align-items:center;color:#9ca3af;"><i class="fas fa-magnifying-glass" style="font-size:13px;"></i></span>
          </div>

          <!-- Sort -->
          <select class="filter-select"
            on:change={(e) => {
              const val = e.target.value;
              if (!val) { activeSortBy = ""; activeSortOrder = "desc"; }
              else { [activeSortBy, activeSortOrder] = val.split("-"); }
              fetchDonations(buildAllFilters());
            }}
          >
            <option value="">Sort: Default</option>
            <option value="donated_amount-desc">Amount: High → Low</option>
            <option value="donated_amount-asc">Amount: Low → High</option>
            <option value="donationDate-desc">Date: Latest First</option>
            <option value="donationDate-asc">Date: Oldest First</option>
          </select>

          <!-- Filters toggle -->
          <button on:click={() => showFilters = !showFilters}
            style="display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:700;padding:10px 18px;border-radius:10px;cursor:pointer;letter-spacing:0.01em;transition:all 0.2s;
            {showFilters ? 'background:#fef2f2;color:#b91c1c;border:1.5px solid #fecaca;' : 'background:#f9fafb;color:#374151;border:1.5px solid #e5e7eb;'}">
            <i class="fas fa-sliders" style="font-size:12px;"></i>
            Filters
            {#if activeFilterCount > 0}
              <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:10px;background:#b91c1c;color:#fff;font-size:11px;font-weight:800;padding:0 5px;">{activeFilterCount}</span>
            {/if}
          </button>

          <button on:click={handleExport} class="export-btn"
            style="margin-left:auto;display:inline-flex;align-items:center;gap:8px;color:#fff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:10px;border:none;cursor:pointer;letter-spacing:0.01em;">
            <i class="fas fa-file-excel" style="font-size:13px;"></i>
            <span class="hidden sm:inline">Export to Excel</span>
            <span class="sm:hidden">Export</span>
          </button>

          <button on:click={() => { showDeletedReceipts = true; fetchDeletedReceipts(); }} class="btn-deleted"
            style="display:inline-flex;align-items:center;gap:8px;color:#fff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:10px;border:none;cursor:pointer;letter-spacing:0.01em;">
            <i class="fas fa-ban" style="font-size:13px;"></i>
            <span class="hidden sm:inline">Deleted Receipts</span>
            <span class="sm:hidden">Deleted</span>
          </button>

        </div>

        <!-- ── ADVANCED FILTER PANEL ── -->
        {#if showFilters}
        <div style="border-top:1px solid #f3f4f6;background:#fafafa;padding:20px 20px 18px;">

          <!-- Row 1: Payment Mode · Donor Type · Purpose -->
          <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;margin-bottom:18px;">

            <div>
              <div class="field-label">Payment Mode</div>
              <div style="display:flex;gap:10px;">
                <label style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;font-weight:600;color:#374151;background:#fff;border:1.5px solid {checkboxPayment.HAND ? '#15803d' : '#e5e7eb'};padding:8px 14px;border-radius:8px;transition:border-color 0.15s;">
                  <input type="checkbox" bind:checked={checkboxPayment.HAND} style="width:14px;height:14px;accent-color:#15803d;" />
                  <i class="fas fa-money-bill" style="font-size:11px;color:#15803d;"></i> Cash
                </label>
                <label style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;font-weight:600;color:#374151;background:#fff;border:1.5px solid {checkboxPayment.UPI ? '#1d4ed8' : '#e5e7eb'};padding:8px 14px;border-radius:8px;transition:border-color 0.15s;">
                  <input type="checkbox" bind:checked={checkboxPayment.UPI} style="width:14px;height:14px;accent-color:#1d4ed8;" />
                  <i class="fas fa-mobile-screen-button" style="font-size:11px;color:#1d4ed8;"></i> UPI
                </label>
              </div>
            </div>

            <div>
              <div class="field-label">Donor Type</div>
              <div style="display:flex;gap:10px;">
                <label style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;font-weight:600;color:#374151;background:#fff;border:1.5px solid {checkboxDonorType.LOCAL ? '#15803d' : '#e5e7eb'};padding:8px 14px;border-radius:8px;transition:border-color 0.15s;">
                  <input type="checkbox" bind:checked={checkboxDonorType.LOCAL} style="width:14px;height:14px;accent-color:#15803d;" />
                  <i class="fas fa-house" style="font-size:11px;color:#15803d;"></i> Local
                </label>
                <label style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;font-weight:600;color:#374151;background:#fff;border:1.5px solid {checkboxDonorType.OUTSTATION ? '#7c3aed' : '#e5e7eb'};padding:8px 14px;border-radius:8px;transition:border-color 0.15s;">
                  <input type="checkbox" bind:checked={checkboxDonorType.OUTSTATION} style="width:14px;height:14px;accent-color:#7c3aed;" />
                  <i class="fas fa-location-dot" style="font-size:11px;color:#7c3aed;"></i> Outstation
                </label>
              </div>
            </div>

            <div>
              <div class="field-label">Purpose</div>
              <div style="display:flex;gap:10px;">
                <label style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;font-weight:600;color:#374151;background:#fff;border:1.5px solid {checkboxPurpose.none ? '#f59e0b' : '#e5e7eb'};padding:8px 14px;border-radius:8px;transition:border-color 0.15s;">
                  <input type="checkbox" bind:checked={checkboxPurpose.none} style="width:14px;height:14px;accent-color:#f59e0b;" />
                  <i class="fas fa-minus-circle" style="font-size:11px;color:#f59e0b;"></i> No Purpose
                </label>
                <label style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;font-weight:600;color:#374151;background:#fff;border:1.5px solid {checkboxPurpose.with ? '#0891b2' : '#e5e7eb'};padding:8px 14px;border-radius:8px;transition:border-color 0.15s;">
                  <input type="checkbox" bind:checked={checkboxPurpose.with} style="width:14px;height:14px;accent-color:#0891b2;" />
                  <i class="fas fa-tag" style="font-size:11px;color:#0891b2;"></i> With Purpose
                </label>
              </div>
            </div>

          </div>

          <!-- Row 2: Amount Range · Date Range · Buttons -->
          <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end;">

            <div>
              <div class="field-label">Amount Range (₹)</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <input type="number" bind:value={filterMinAmount} placeholder="Min ₹"
                  class="field-input" style="width:110px;" />
                <span style="font-size:12px;color:#9ca3af;font-weight:600;">to</span>
                <input type="number" bind:value={filterMaxAmount} placeholder="Max ₹"
                  class="field-input" style="width:110px;" />
              </div>
            </div>

            <div>
              <div class="field-label">Donation Date Range</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <input type="date" bind:value={filterDateFrom} class="field-input" style="width:158px;" />
                <span style="font-size:12px;color:#9ca3af;font-weight:600;">to</span>
                <input type="date" bind:value={filterDateTo} class="field-input" style="width:158px;" />
              </div>
            </div>

            <div style="display:flex;gap:8px;margin-left:auto;">
              <button on:click={() => fetchDonations(buildAllFilters())}
                style="display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:700;padding:10px 22px;border-radius:10px;background:linear-gradient(135deg,#991b1b,#b91c1c);color:#fff;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(185,28,28,0.3);transition:all 0.2s;">
                <i class="fas fa-magnifying-glass" style="font-size:12px;"></i> Apply Filters
              </button>
              {#if activeFilterCount > 0}
              <button on:click={clearFilters}
                style="display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:600;padding:10px 18px;border-radius:10px;background:#fff;color:#6b7280;border:1.5px solid #e5e7eb;cursor:pointer;transition:all 0.2s;">
                <i class="fas fa-xmark" style="font-size:12px;"></i> Clear
              </button>
              {/if}
            </div>

          </div>

        </div>
        {/if}

      </div>

      <!-- ── DONATIONS TABLE ── -->
      <div style="background:#fff;border-radius:18px;border:1px solid #e5e7eb;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">

        <!-- Table toolbar -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #f3f4f6;background:linear-gradient(135deg,#fff 0%,#fafafa 100%);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:4px;height:22px;border-radius:2px;background:linear-gradient(180deg,#b91c1c,#dc2626);"></div>
            <span style="font-size:16px;font-weight:800;color:#111827;letter-spacing:-0.2px;">Donation Records</span>
          </div>
          {#if donations.length > 0}
            <div style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#b91c1c;background:#fef2f2;padding:5px 14px;border-radius:20px;border:1px solid #fecaca;">
              <i class="fas fa-list" style="font-size:11px;"></i>
              {donations.length} records
            </div>
          {/if}
        </div>

        {#if loading}
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:72px 0;gap:14px;">
            <div style="width:48px;height:48px;border-radius:50%;border:3px solid #fecaca;border-top-color:#b91c1c;animation:spin 0.8s linear infinite;"></div>
            <span style="font-size:15px;font-weight:500;color:#6b7280;">Loading donations...</span>
          </div>
        {:else if donations.length === 0}
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;gap:12px;">
            <div style="width:64px;height:64px;border-radius:18px;background:#f9fafb;border:2px dashed #e5e7eb;display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-inbox" style="font-size:28px;color:#d1d5db;"></i>
            </div>
            <div style="font-size:17px;font-weight:700;color:#374151;">No donations found</div>
            <div style="font-size:14px;color:#9ca3af;">Try adjusting your search or filters</div>
          </div>
        {:else}
          <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
            <table style="width:100%;min-width:900px;border-collapse:collapse;">
              <thead>
                <tr style="background:#f9fafb;border-bottom:2px solid #f3f4f6;">
                  <th style="padding:13px 18px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;width:44px;">#</th>
                  <th style="padding:13px 18px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Donor</th>
                  <th style="padding:13px 18px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Amount</th>
                  <th class="hidden md:table-cell" style="padding:13px 18px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Receipt</th>
                  <th style="padding:13px 18px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Payment</th>
                  <th class="hidden sm:table-cell" style="padding:13px 18px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Date</th>
                  <th style="padding:13px 18px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each donations as donation, i}
                  <tr class="table-row" style="border-bottom:1px solid #f3f4f6;{i % 2 !== 0 ? 'background:#fafafa;' : 'background:#fff;'}">
                    <td style="padding:15px 18px;font-size:12px;color:#d1d5db;font-weight:600;font-variant-numeric:tabular-nums;">{i + 1}</td>
                    <td style="padding:15px 18px;">
                      <div style="font-size:15px;font-weight:700;color:#111827;">{donation.name}</div>
                      {#if donation.donorType === 'OUTSTATION'}
                        <span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:#7c3aed;background:#f5f3ff;border:1px solid #ddd6fe;padding:2px 8px;border-radius:20px;margin-top:4px;">
                          <i class="fas fa-location-dot" style="font-size:9px;"></i> Outstation
                        </span>
                      {:else if donation.donorType === 'LOCAL'}
                        <span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:2px 8px;border-radius:20px;margin-top:4px;">
                          <i class="fas fa-house" style="font-size:9px;"></i> Local
                        </span>
                      {/if}
                    </td>
                    <td style="padding:15px 18px;">
                      <span style="font-size:16px;font-weight:800;color:#b91c1c;letter-spacing:-0.3px;">₹{donation.donated_amount}</span>
                    </td>
                    <td class="hidden md:table-cell" style="padding:15px 18px;">
                      <span class="receipt-badge">{donation.receiptNumber}</span>
                    </td>
                    <td style="padding:15px 18px;">
                      {#if donation.paymentMode === 'UPI'}
                        <span class="payment-upi"><i class="fas fa-mobile-screen-button" style="font-size:10px;"></i> UPI</span>
                      {:else}
                        <span class="payment-cash"><i class="fas fa-money-bill" style="font-size:10px;"></i> Cash</span>
                      {/if}
                    </td>
                    <td class="hidden sm:table-cell" style="padding:15px 18px;font-size:13px;font-weight:500;color:#6b7280;">{new Date(donation.donationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style="padding:10px 18px;">
                      <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">

                        <button title="Edit donation" on:click={() => { handleEdit(donation); }} class="btn-edit">
                          <i class="fas fa-pencil" style="font-size:11px;"></i> Edit
                        </button>

                        <button title="Print receipt" on:click={() => handlePrint(donation._id)} class="btn-print">
                          <i class="fas fa-receipt" style="font-size:11px;"></i> Print
                        </button>

                        <button title="Download PDF" on:click={() => handlePDF(donation._id)} class="btn-pdf">
                          <i class="fas fa-file-arrow-down" style="font-size:11px;"></i> PDF
                        </button>

                        <button title="Mail receipt to donor" on:click={() => sendEmail(donation._id)} class="btn-mail">
                          <i class="fas fa-paper-plane" style="font-size:11px;"></i> Mail
                        </button>

                        {#if editingEmailRow === donation._id}
                          <input type="email" placeholder="Enter email..."
                            bind:value={customEmail}
                            style="font-size:13px;border:1.5px solid #e5e7eb;border-radius:8px;padding:6px 12px;outline:none;width:160px;color:#111827;background:#f9fafb;"
                          />
                          <button title="Send" disabled={sending} on:click={() => sendCustomEmail(donation._id)}
                            style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;background:linear-gradient(135deg,#14532d,#15803d);color:#fff;border:none;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(21,128,61,0.35);">
                            {#if sending}
                              <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" opacity="0.3"/>
                                <path d="M22 12a10 10 0 00-10-10" stroke="white" stroke-width="4"/>
                              </svg>
                              Sending...
                            {:else}
                              <i class="fas fa-paper-plane" style="font-size:10px;"></i> Send
                            {/if}
                          </button>
                          <button title="Cancel" on:click={() => { editingEmailRow = null; customEmail = ""; }}
                            style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;background:#f9fafb;color:#374151;border:1.5px solid #e5e7eb;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
                            <i class="fas fa-xmark" style="font-size:11px;"></i> Cancel
                          </button>
                        {:else}
                          <button title="Send receipt to custom email" on:click={() => editingEmailRow = donation._id} class="btn-mail2">
                            <i class="fas fa-share-nodes" style="font-size:11px;"></i> Forward
                          </button>
                        {/if}

                        <button title="Delete donation" on:click={() => handleDelete(donation._id)} class="btn-delete">
                          <i class="fas fa-trash-can" style="font-size:11px;"></i> Delete
                        </button>

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

    <!-- ── ADD DONATION MODAL ── -->
    {#if showAddForm}
    <div class="modal-overlay">
      <div class="modal-box">

        <!-- Gradient header -->
        <div class="modal-header modal-header-add">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-plus" style="color:#fff;font-size:15px;"></i>
            </div>
            <div>
              <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.3px;">New Donation</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:1px;">Record a new donation entry</div>
            </div>
          </div>
          <button title="Close" on:click={() => { showAddForm = false; showAddPurpose = false; formData.purpose = ""; }} class="modal-close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Tamil toggle -->
        <div style="padding:14px 26px;border-bottom:1px solid #f3f4f6;background:#fafafa;">
          <label style="display:inline-flex;align-items:center;gap:10px;cursor:pointer;">
            <input type="checkbox" bind:checked={tamilTyping} style="width:16px;height:16px;accent-color:#b91c1c;" />
            <span style="font-size:14px;font-weight:600;color:#374151;">Tamil Phonetic Typing</span>
            <span style="font-size:13px;color:#9ca3af;">— type English, get Tamil script</span>
          </label>
        </div>

        <!-- Form -->
        <div class="modal-body">
          <div>
            <label for="add-donor-name" class="field-label">Donor Name *</label>
            <input id="add-donor-name" bind:value={formData.name}
              use:tamilTransliterate={{ enabled: tamilTyping, onChange: (value) => updateFormField("name", value) }}
              class="field-input" />
          </div>
          <div>
            <label for="add-amount" class="field-label">Amount (₹) *</label>
            <div style="position:relative;">
              <span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:15px;font-weight:700;">₹</span>
              <input id="add-amount" type="number" bind:value={formData.donated_amount} required
                class="field-input" style="padding-left:30px;" />
            </div>
          </div>
          <div style="grid-column:1/-1;">
            <label for="add-address" class="field-label">Address (City / Town) *</label>
            <CityAutocomplete bind:value={formData.address} placeholder="Start typing city name..." required tamilTyping={tamilTyping} />
          </div>
          <div>
            <label for="add-phone" class="field-label">Phone</label>
            <input id="add-phone" bind:value={formData.phone} class="field-input" />
          </div>
          <div>
            <label for="add-email" class="field-label">Email</label>
            <input id="add-email" type="email" bind:value={formData.email} class="field-input" />
          </div>
          <div>
            <label for="add-payment" class="field-label">Payment Mode *</label>
            <select id="add-payment" bind:value={formData.paymentMode} class="field-input" style="cursor:pointer;">
              <option value="HAND">Cash</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div>
            <label for="add-donor-type" class="field-label">Donor Type *</label>
            <select id="add-donor-type" bind:value={formData.donorType} class="field-input" style="cursor:pointer;">
              <option value="LOCAL">Local</option>
              <option value="OUTSTATION">Outstation</option>
            </select>
          </div>
          <div>
            <label for="add-date" class="field-label">Donation Date *</label>
            <input id="add-date" type="date" bind:value={formData.donationDate} required class="field-input" />
          </div>
          {#if formData.paymentMode === "UPI"}
          <div style="grid-column:1/-1;">
            <label for="add-txn" class="field-label">Transaction ID</label>
            <input id="add-txn" bind:value={formData.transactionId} class="field-input" />
          </div>
          {/if}
          <div style="grid-column:1/-1;">
            {#if showAddPurpose}
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="flex:1;">
                  <label for="add-purpose" class="field-label">Purpose!</label>
                  <input id="add-purpose" bind:value={formData.purpose} placeholder="Enter the purpose of donation..."
                    class="field-input" />
                </div>
                <button type="button" title="Remove purpose" on:click={() => { showAddPurpose = false; formData.purpose = ""; }}
                  style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;background:#fff1f2;color:#e11d48;border:1.5px solid #fecdd3;cursor:pointer;font-size:13px;flex-shrink:0;margin-top:22px;">
                  <i class="fas fa-xmark"></i>
                </button>
              </div>
            {:else}
              <button type="button" on:click={() => { showAddPurpose = true; }}
                style="display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;background:#f0fdf4;color:#15803d;border:1.5px solid #bbf7d0;cursor:pointer;font-size:13px;font-weight:700;transition:all 0.15s;">
                <i class="fas fa-tag" style="font-size:11px;"></i> Purpose
              </button>
            {/if}
          </div>
          <div style="grid-column:1/-1;">
            <label for="add-desc" class="field-label">Description</label>
            <textarea id="add-desc" bind:value={formData.description} rows="2"
              use:tamilTransliterate={{ enabled: tamilTyping, onChange: (value) => updateFormField("description", value) }}
              class="field-input" style="resize:none;"></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button on:click={() => handleAddDonation(false)} class="btn-save">
            <i class="fas fa-floppy-disk" style="margin-right:7px;font-size:13px;"></i>Save Donation
          </button>
          <button on:click={() => handleAddDonation(true)} class="btn-save-print">
            <i class="fas fa-print" style="margin-right:7px;font-size:13px;"></i>Save &amp; Print
          </button>
          <button on:click={() => { showAddForm = false; showAddPurpose = false; formData.purpose = ""; }} class="btn-cancel">Cancel</button>
        </div>

      </div>
    </div>
    {/if}

    <!-- ── EDIT DONATION MODAL ── -->
    {#if showEditForm}
    <div class="modal-overlay">
      <div class="modal-box">

        <!-- Gradient header -->
        <div class="modal-header modal-header-edit">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-pencil" style="color:#fff;font-size:15px;"></i>
            </div>
            <div>
              <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.3px;">Edit Donation</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:1px;">Update the donation details</div>
            </div>
          </div>
          <button title="Close" on:click={() => { showEditForm = false; editingId = null; resetFormData(); }} class="modal-close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Tamil toggle -->
        <div style="padding:14px 26px;border-bottom:1px solid #f3f4f6;background:#fafafa;">
          <label style="display:inline-flex;align-items:center;gap:10px;cursor:pointer;">
            <input type="checkbox" bind:checked={tamilTyping} style="width:16px;height:16px;accent-color:#b91c1c;" />
            <span style="font-size:14px;font-weight:600;color:#374151;">Tamil Phonetic Typing</span>
            <span style="font-size:13px;color:#9ca3af;">— type English, get Tamil script</span>
          </label>
        </div>

        <!-- Form -->
        <div class="modal-body">
          <div>
            <label for="edit-donor-name" class="field-label">Donor Name *</label>
            <input id="edit-donor-name" bind:value={formData.name}
              use:tamilTransliterate={{ enabled: tamilTyping, onChange: (value) => updateFormField("name", value) }}
              class="field-input" />
          </div>
          <div>
            <label for="edit-amount" class="field-label">Amount (₹) *</label>
            <div style="position:relative;">
              <span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:15px;font-weight:700;">₹</span>
              <input id="edit-amount" type="number" bind:value={formData.donated_amount} required
                class="field-input" style="padding-left:30px;" />
            </div>
          </div>
          <div style="grid-column:1/-1;">
            <label for="edit-address" class="field-label">Address (City / Town) *</label>
            <CityAutocomplete bind:value={formData.address} placeholder="Start typing city name..." required tamilTyping={tamilTyping} />
          </div>
          <div>
            <label for="edit-phone" class="field-label">Phone</label>
            <input id="edit-phone" bind:value={formData.phone} class="field-input" />
          </div>
          <div>
            <label for="edit-email" class="field-label">Email</label>
            <input id="edit-email" type="email" bind:value={formData.email} class="field-input" />
          </div>
          <div>
            <label for="edit-payment" class="field-label">Payment Mode *</label>
            <select id="edit-payment" bind:value={formData.paymentMode} class="field-input" style="cursor:pointer;">
              <option value="HAND">Cash</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div>
            <label for="edit-donor-type" class="field-label">Donor Type *</label>
            <select id="edit-donor-type" bind:value={formData.donorType} class="field-input" style="cursor:pointer;">
              <option value="LOCAL">Local</option>
              <option value="OUTSTATION">Outstation</option>
            </select>
          </div>
          <div>
            <label for="edit-date" class="field-label">Donation Date *</label>
            <input id="edit-date" type="date" bind:value={formData.donationDate} required class="field-input" />
          </div>
          {#if formData.paymentMode === "UPI"}
          <div style="grid-column:1/-1;">
            <label for="edit-txn" class="field-label">Transaction ID</label>
            <input id="edit-txn" bind:value={formData.transactionId} class="field-input" />
          </div>
          {/if}
          <div style="grid-column:1/-1;">
            {#if showEditPurpose}
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="flex:1;">
                  <label for="edit-purpose" class="field-label">Purpose!</label>
                  <input id="edit-purpose" bind:value={formData.purpose} placeholder="Enter the purpose of donation..."
                    class="field-input" />
                </div>
                <button type="button" title="Remove purpose" on:click={() => { showEditPurpose = false; formData.purpose = ""; }}
                  style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;background:#fff1f2;color:#e11d48;border:1.5px solid #fecdd3;cursor:pointer;font-size:13px;flex-shrink:0;margin-top:22px;">
                  <i class="fas fa-xmark"></i>
                </button>
              </div>
            {:else}
              <button type="button" on:click={() => { showEditPurpose = true; }}
                style="display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;background:#f0fdf4;color:#15803d;border:1.5px solid #bbf7d0;cursor:pointer;font-size:13px;font-weight:700;transition:all 0.15s;">
                <i class="fas fa-tag" style="font-size:11px;"></i> Purpose
              </button>
            {/if}
          </div>
          <div style="grid-column:1/-1;">
            <label for="edit-desc" class="field-label">Description</label>
            <textarea id="edit-desc" bind:value={formData.description} rows="2"
              use:tamilTransliterate={{ enabled: tamilTyping, onChange: (value) => updateFormField("description", value) }}
              class="field-input" style="resize:none;"></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button on:click={() => handleAddDonation(false)} class="btn-update">
            <i class="fas fa-floppy-disk" style="margin-right:7px;font-size:13px;"></i>Update Donation
          </button>
          <button on:click={() => { showEditForm = false; editingId = null; resetFormData(); }} class="btn-cancel">Cancel</button>
        </div>

      </div>
    </div>
    {/if}

  <!-- ── DELETED RECEIPTS MODAL ── -->
  {#if showDeletedReceipts}
  <div class="modal-overlay" style="align-items:flex-start;padding-top:40px;">
    <div class="modal-box" style="max-width:860px;">

      <!-- Header -->
      <div class="modal-header" style="background:linear-gradient(135deg,#1e1b4b 0%,#3730a3 100%);border-radius:22px 22px 0 0;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-ban" style="color:#fff;font-size:15px;"></i>
          </div>
          <div>
            <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.3px;">Deleted Receipt Numbers</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:1px;">These numbers are permanently retired and will never be reused</div>
          </div>
        </div>
        <button title="Close" on:click={() => showDeletedReceipts = false} class="modal-close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Body -->
      <div style="padding:0;">
        {#if loadingDeleted}
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 0;gap:14px;">
            <div style="width:44px;height:44px;border-radius:50%;border:3px solid #c7d2fe;border-top-color:#3730a3;animation:spin 0.8s linear infinite;"></div>
            <span style="font-size:14px;color:#6b7280;">Loading deleted receipts...</span>
          </div>
        {:else if deletedReceipts.length === 0}
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:72px 0;gap:12px;">
            <div style="width:60px;height:60px;border-radius:18px;background:#f9fafb;border:2px dashed #e5e7eb;display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-check-circle" style="font-size:26px;color:#86efac;"></i>
            </div>
            <div style="font-size:16px;font-weight:700;color:#374151;">No deleted receipts</div>
            <div style="font-size:13px;color:#9ca3af;">All receipt numbers are currently active</div>
          </div>
        {:else}
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f5f3ff;border-bottom:2px solid #e9d5ff;">
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">#</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Receipt No.</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Donor</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Amount</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Payment</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Type</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Donation Date</th>
                  <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Deleted On</th>
                </tr>
              </thead>
              <tbody>
                {#each deletedReceipts as dr, i}
                  <tr style="border-bottom:1px solid #f3f4f6;{i % 2 !== 0 ? 'background:#fafafa;' : 'background:#fff;'}">
                    <td style="padding:13px 16px;font-size:12px;color:#d1d5db;font-weight:600;">{i + 1}</td>
                    <td style="padding:13px 16px;">
                      <span style="font-family:'SF Mono',ui-monospace,monospace;font-size:12px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;padding:4px 10px;border-radius:7px;font-weight:700;text-decoration:line-through;opacity:0.8;">
                        {dr.receiptNumber}
                      </span>
                    </td>
                    <td style="padding:13px 16px;">
                      <div style="font-size:14px;font-weight:700;color:#111827;">{dr.name}</div>
                      <div style="font-size:12px;color:#9ca3af;margin-top:2px;">{dr.address}</div>
                    </td>
                    <td style="padding:13px 16px;font-size:15px;font-weight:800;color:#b91c1c;">₹{dr.donated_amount}</td>
                    <td style="padding:13px 16px;">
                      {#if dr.paymentMode === 'UPI'}
                        <span style="font-size:11.5px;font-weight:700;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;padding:3px 10px;border-radius:20px;">UPI</span>
                      {:else}
                        <span style="font-size:11.5px;font-weight:700;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:3px 10px;border-radius:20px;">Cash</span>
                      {/if}
                    </td>
                    <td style="padding:13px 16px;">
                      {#if dr.donorType === 'OUTSTATION'}
                        <span style="font-size:11.5px;font-weight:700;color:#7c3aed;background:#f5f3ff;border:1px solid #ddd6fe;padding:3px 10px;border-radius:20px;">Outstation</span>
                      {:else}
                        <span style="font-size:11.5px;font-weight:700;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:3px 10px;border-radius:20px;">Local</span>
                      {/if}
                    </td>
                    <td style="padding:13px 16px;font-size:13px;color:#6b7280;">{new Date(dr.donationDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                    <td style="padding:13px 16px;">
                      <div style="font-size:12px;color:#9ca3af;">{new Date(dr.deletedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
                      <div style="font-size:11px;color:#c4b5fd;margin-top:1px;">{new Date(dr.deletedAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <div style="padding:14px 20px;border-top:1px solid #f3f4f6;background:#fafafa;border-radius:0 0 22px 22px;text-align:right;">
            <span style="font-size:13px;font-weight:600;color:#7c3aed;">{deletedReceipts.length} retired receipt{deletedReceipts.length !== 1 ? 's' : ''}</span>
          </div>
        {/if}
      </div>

    </div>
  </div>
  {/if}

  <!-- ── TOAST NOTIFICATIONS ── -->
  <div style="position:fixed;top:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;">
    {#each toasts as toast (toast.id)}
      <div style="pointer-events:auto;display:flex;align-items:flex-start;gap:12px;min-width:300px;max-width:380px;padding:14px 18px;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.1);backdrop-filter:blur(12px);animation:toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
        {toast.type === 'success' ? 'background:linear-gradient(135deg,#14532d,#15803d);border:1px solid rgba(134,239,172,0.3);' :
         toast.type === 'error'   ? 'background:linear-gradient(135deg,#7f1d1d,#b91c1c);border:1px solid rgba(252,165,165,0.3);' :
                                    'background:linear-gradient(135deg,#1e3a5f,#1d4ed8);border:1px solid rgba(147,197,253,0.3);'}">
        <div style="width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
          <i class="fas {toast.type === 'success' ? 'fa-circle-check' : toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}" style="font-size:15px;color:#fff;"></i>
        </div>
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">
            {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Info'}
          </div>
          <div style="font-size:13.5px;font-weight:600;color:#fff;line-height:1.4;">{toast.message}</div>
        </div>
        <button title="Dismiss" aria-label="Dismiss notification" on:click={() => toasts = toasts.filter(t => t.id !== toast.id)}
          style="background:rgba(255,255,255,0.15);border:none;color:rgba(255,255,255,0.7);cursor:pointer;width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;margin-top:1px;">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
    {/each}
  </div>

  <!-- ── CONFIRM MODAL ── -->
  {#if confirmModal.show}
  <div style="position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);">
    <div style="background:#fff;border-radius:22px;box-shadow:0 24px 64px rgba(0,0,0,0.25);width:100%;max-width:420px;overflow:hidden;animation:toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1);">
      <div style="background:linear-gradient(135deg,#7f1d1d,#b91c1c);padding:22px 24px;display:flex;align-items:center;gap:14px;">
        <div style="width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fas fa-triangle-exclamation" style="font-size:18px;color:#fff;"></i>
        </div>
        <div>
          <div style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-0.2px;">Confirm Delete</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:2px;">This action is permanent</div>
        </div>
      </div>
      <div style="padding:24px;">
        <p style="font-size:14.5px;color:#374151;line-height:1.6;margin:0;">{confirmModal.message}</p>
      </div>
      <div style="padding:0 24px 22px;display:flex;gap:10px;justify-content:flex-end;">
        <button on:click={closeConfirm}
          style="font-size:14px;font-weight:600;color:#6b7280;background:#f9fafb;border:1.5px solid #e5e7eb;padding:10px 20px;border-radius:10px;cursor:pointer;">
          Cancel
        </button>
        <button on:click={() => { const fn = confirmModal.onConfirm; closeConfirm(); fn && fn(); }}
          style="font-size:14px;font-weight:700;color:#fff;background:linear-gradient(135deg,#991b1b,#b91c1c);border:none;padding:10px 22px;border-radius:10px;cursor:pointer;box-shadow:0 2px 10px rgba(185,28,28,0.4);">
          <i class="fas fa-trash-can" style="margin-right:7px;font-size:12px;"></i>Yes, Delete
        </button>
      </div>
    </div>
  </div>
  {/if}

  </div>

