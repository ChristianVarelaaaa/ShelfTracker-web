
// ==========================================
// 1. STATE & STORAGE MANAGEMENT (SPRING BOOT INTEGRATION)
// ==========================================
const BASE_URL = 'https://shelftracker-backend.onrender.com';
let products = [];
let lowStockThreshold = 10;

// ==========================================
// 2. AUTHENTICATION & ACCESS CONTROL
// ==========================================

function initializeUserSession() {
  const userRole = sessionStorage.getItem("userRole");
  if (!userRole) {
    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("userRole", "CUSTOMER");
    sessionStorage.setItem("username", "Guest");
  }
}


function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert("Please enter both username and password.");
        return;
    }

    // 1. Correct URL path including /api
    fetch(${BASE_URL}/api/auth/login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Maling Username o Password.");
        }
        return response.json();
    })
    .then(data => {
        // 2. data.message will match your backend's k1: "message" 
        alert(data.message || "Login successful!");

        // 3. Match backend payload fields directly (data.role and data.username)
        if (data.role !== 'ADMIN' && data.role !== 'STAFF') {
            throw new Error("Access denied. Admins only.");
        }

        // 4. Save session elements using valid JSON keys
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userRole", data.role);
        sessionStorage.setItem("username", data.username);
        
        // Go straight to your application home base
        window.location.href = 'index.html';
    })
    .catch(error => {
        alert(error.message);
    });
}

function registerAccount() {
  const newUsername = document.getElementById('newUsername').value.trim();
  const newPassword = document.getElementById('newPassword').value;

  if (!newUsername || !newPassword) {
    alert("Please fill in both fields."); return;
  }

  fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requesting-Role': 'ADMIN'
    },
    body: JSON.stringify({ username: newUsername, password: newPassword, role: 'ADMIN' })
  })
.then(async res => {
    // Check if the response is JSON or plain text
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return res.json();
    } else {
        const textData = await res.text();
        return { message: textData }; // Wrap plain text in a message object
    }
})
.then(data => {
    // This turns the [object Object] into readable text in the alert box
    alert(JSON.stringify(data));
    
    // Check if the backend message or raw text indicates success
    if (JSON.stringify(data).toLowerCase().includes('success') || data.message === 'Account registered successfully!') {
        window.location.href = 'login.html';
    }
})
  .catch(err => alert("Error: " + err.message));
}

function logout() { 
  sessionStorage.clear();
  window.location.href = 'index.html'; 
}

function enforceAccessControl() {
  initializeUserSession();

  const currentPage = window.location.pathname.split('/').pop();
  const userRole = sessionStorage.getItem("userRole");

  if (currentPage === 'settings.html' && userRole === 'CUSTOMER') {
    window.location.href = 'index.html';
    return;
  }

  // Redirect already logged-in admins away from login/signup
  if ((currentPage === 'login.html' || currentPage === 'signup.html') &&
      (userRole === 'ADMIN' || userRole === 'STAFF')) {
    window.location.href = 'index.html';
    return;
  }

  const authHeaderZone = document.getElementById('authHeaderZone');
  if (authHeaderZone && currentPage !== 'login.html' && currentPage !== 'signup.html') {
    const username = sessionStorage.getItem("username");
    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      authHeaderZone.innerHTML = `<span>${username} (${userRole})</span> | <button onclick="logout()" class="btn btn-danger" style="padding: 6px 12px; font-size: 14px;">Logout</button>`;
    } else {
      authHeaderZone.innerHTML = `<span>${username} (${userRole})</span> | <button onclick="window.location.href='login.html'" class="btn btn-primary" style="padding: 6px 12px; font-size: 14px;">Admin Login</button>`;
    }
  }
}

function handleRoleVisibility() {
  const userRole = sessionStorage.getItem("userRole");
  
  if (userRole === 'CUSTOMER' || userRole === 'STAFF') {
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) addProductBtn.style.display = 'none';

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.style.display = 'none';
  }
}

// ==========================================
// 3. DATA FETCHING & RENDERING ENGINE
// ==========================================

function getStatus(qty, exp) { 
  const daysLeft = Math.ceil((new Date(exp) - new Date()) / (1000*60*60*24)); 
  if(qty <= 0 || daysLeft <= 7) return {color:'red', text:'Critical/Near Expiry'}; 
  if(qty <= lowStockThreshold) return {color:'yellow', text:'Low Stock'}; 
  return {color:'green', text:'High Stock'}; 
}

function loadAllDataFromServer() {
  fetch(`${BASE_URL}/products`)
    .then(res => res.json())
    .then(data => {
      products = data;
      return fetch(`${BASE_URL}/dashboard/summary`);
    })
    .then(res => res.json())
    .then(summaryData => {
      lowStockThreshold = summaryData.thresholdValue;
      
      if (document.getElementById('totalProducts')) {
        document.getElementById('totalProducts').textContent = summaryData.totalProducts;
      }
      if (document.getElementById('criticalItems')) {
        document.getElementById('criticalItems').textContent = summaryData.criticalItems;
      }
      
      renderAll();
    })
    .catch(err => console.error("Error connecting to backend:", err));
}

function renderAll() { 
  handleRoleVisibility();
  if (document.querySelector('#productTable tbody')) renderProducts(); 
  if (document.getElementById('alertsList')) renderAlerts(); 
  if (document.querySelector('#expiryTable tbody')) renderExpiry(); 
  if (document.getElementById('lowStockThreshold')) updateSettingsInfo();
}

function renderProducts() { 
  const tbody = document.querySelector('#productTable tbody'); 
  tbody.innerHTML = ''; 
  const userRole = sessionStorage.getItem("userRole");
  
  if(products.length === 0) {
    const colSpanValue = (userRole === 'ADMIN' || userRole === 'STAFF') ? 6 : 5;
    tbody.innerHTML = `<tr><td colspan="${colSpanValue}" style="text-align:center; padding:2rem; color:#64748b;">No products yet.</td></tr>`;
    return;
  }
  
  products.forEach(p => { 
    const status = getStatus(p.qty, p.exp); 
    tbody.innerHTML += ` 
      <tr> 
        <td>${p.name}</td> 
        <td>${p.qty}</td> 
        <td>${p.unit}</td> 
        <td>${p.exp}</td> 
        <td><span class="status-dot status-${status.color}"></span>${status.text}</td> 
        ${userRole === 'ADMIN' ? `
        <td> 
          <button class="btn btn-primary" onclick="editProduct(${p.id})">Edit</button> 
          <button class="btn btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
        </td>` : ''} 
        ${userRole === 'STAFF' ? `
        <td> 
          <button class="btn btn-primary" onclick="quickStockAdjustment(${p.id}, ${p.qty})">Stock-In/Out</button> 
        </td>` : ''}
      </tr>`; 
  }); 
}

function renderAlerts() { 
  const alertsDiv = document.getElementById('alertsList'); 
  alertsDiv.innerHTML = ''; 
  
  products.forEach(p => { 
    const status = getStatus(p.qty, p.exp); 
    if(status.color !== 'green') { 
      alertsDiv.innerHTML += `<p><span class="status-dot status-${status.color}"></span>${p.name} - ${p.qty} ${p.unit} - ${status.text}</p>`; 
    } 
  }); 
  
  if(!alertsDiv.innerHTML) alertsDiv.innerHTML = '<p>No alerts. All good!</p>'; 
}

function renderExpiry() { 
  const tbody = document.querySelector('#expiryTable tbody'); 
  tbody.innerHTML = ''; 
  
  if(products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#64748b;">No products to monitor.</td></tr>';
    return;
  }
  
  products.forEach(p => { 
    const daysLeft = Math.ceil((new Date(p.exp) - new Date()) / (1000*60*60*24)); 
    const status = getStatus(p.qty, p.exp); 
    tbody.innerHTML += ` 
      <tr> 
        <td>${p.name}</td> 
        <td>${p.qty} ${p.unit}</td> 
        <td>${p.exp}</td> 
        <td>${daysLeft <= 0 ? 'Expired' : daysLeft + ' days'}</td> 
        <td><span class="status-dot status-${status.color}"></span>${status.text}</td> 
      </tr>`; 
  }); 
}

// ==========================================
// 4. PRODUCT MANAGEMENT (REST API OPERATION)
// ==========================================

function openModal() { 
  document.getElementById('productModal').classList.add('active'); 
  document.getElementById('modalTitle').textContent = 'Add Product'; 
  document.getElementById('editId').value = ''; 
  document.getElementById('prodName').value = ''; 
  document.getElementById('prodQty').value = ''; 
  document.getElementById('prodUnit').value = 'pcs'; 
  document.getElementById('prodExp').value = ''; 
  document.getElementById('qtyError').textContent = ''; 
  document.getElementById('expError').textContent = ''; 
}

function closeModal() { 
  document.getElementById('productModal').classList.remove('active'); 
}

function editProduct(id) { 
  const p = products.find(x => x.id === id); 
  document.getElementById('modalTitle').textContent = 'Edit Product'; 
  document.getElementById('editId').value = id; 
  document.getElementById('prodName').value = p.name; 
  document.getElementById('prodQty').value = p.qty; 
  document.getElementById('prodUnit').value = p.unit; 
  document.getElementById('prodExp').value = p.exp; 
  document.getElementById('productModal').classList.add('active'); 
}

function saveProduct() { 
  const id = document.getElementById('editId').value; 
  const name = document.getElementById('prodName').value.trim(); 
  const qty = parseInt(document.getElementById('prodQty').value); 
  const unit = document.getElementById('prodUnit').value; 
  const exp = document.getElementById('prodExp').value; 
  
  if(!name) { alert("Product name is required"); return; } 
  if(isNaN(qty) || qty < 0) { document.getElementById('qtyError').textContent = 'Invalid numeric quantity'; return; } 
  if(!exp) { document.getElementById('expError').textContent = 'Product expiration date is required'; return; } 
  
  const payload = { name, qty, unit, exp };
  
  let url = `${BASE_URL}/products`;
  let method = 'POST';
  
  if(id && id !== '') { 
    url = `${BASE_URL}/products/${id}`;
    method = 'PUT';
  }
  
  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if(!res.ok) throw new Error("Failed to save product details.");
    closeModal();
    loadAllDataFromServer();
  })
  .catch(err => alert(err.message));
}

function deleteProduct(id) { 
  if(confirm("Are you sure you want to delete this product from the database?")) { 
    fetch(`${BASE_URL}/products/${id}`, { method: 'DELETE' })
      .then(res => {
         if(!res.ok) throw new Error("Delete restricted.");
         loadAllDataFromServer();
      })
      .catch(err => alert(err.message));
  } 
}

function quickStockAdjustment(id, currentQty) {
  const adjustment = prompt("Enter value to add (e.g. 10) or subtract (e.g. -5):");
  if (!adjustment || isNaN(adjustment)) return;
  
  const targetQty = currentQty + parseInt(adjustment);
  if (targetQty < 0) { alert("Stock cannot drop below zero."); return; }
  
  fetch(`${BASE_URL}/products/${id}/quantity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qty: targetQty })
  })
  .then(res => {
    if(!res.ok) throw new Error("Could not update stock.");
    loadAllDataFromServer();
  })
  .catch(err => alert(err.message));
}

function saveSettings() { 
  const newThreshold = parseInt(document.getElementById('lowStockThreshold').value); 
  if(isNaN(newThreshold) || newThreshold < 1) { alert("Please enter a valid number"); return; } 
  
  fetch(`${BASE_URL}/dashboard/threshold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newThreshold: newThreshold })
  })
  .then(res => {
    if(!res.ok) throw new Error("Failed to update settings.");
    alert("System dynamic alert configuration updated!");
    loadAllDataFromServer();
  })
  .catch(err => alert(err.message));
}

function updateSettingsInfo() { 
  const userRole = sessionStorage.getItem("userRole");
  document.getElementById('currentRoleDisplay').textContent = userRole; 
  document.getElementById('lowStockThreshold').value = lowStockThreshold;
}

// ==========================================
// 5. INITIALIZATION
// ==========================================
enforceAccessControl();

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage !== 'login.html') {
    loadAllDataFromServer(); // Pull data directly from server on startup
  }
});


// ==========================================
// 6. ADMIN REGISTRATION
// ==========================================

function registerNewAdmin() {
  const username = document.getElementById('newAdminUsername').value.trim();
  const password = document.getElementById('newAdminPassword').value;

  if (!username || !password) { alert("Fill in both fields."); return; }

  fetch(`${BASE_URL}/auth/register-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requesting-Role': sessionStorage.getItem("userRole")
    },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    document.getElementById('newAdminUsername').value = '';
    document.getElementById('newAdminPassword').value = '';
  })
  .catch(err => alert("Error: " + err.message));
}