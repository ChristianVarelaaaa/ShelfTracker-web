// ==========================================
// 1. STATE & STORAGE MANAGEMENT
// ==========================================
let products = JSON.parse(localStorage.getItem('shelfTracker_products')) || [];
let lowStockThreshold = parseInt(localStorage.getItem('shelfTracker_threshold')) || 10;

function saveStateToStorage() {
  localStorage.setItem('shelfTracker_products', JSON.stringify(products));
  localStorage.setItem('shelfTracker_threshold', lowStockThreshold);
}

// ==========================================
// 2. AUTHENTICATION & ACCESS CONTROL
// ==========================================

function initializeUserSession() {
  const userRole = sessionStorage.getItem("userRole");
  
  // If no one is logged in, automatically make them a Customer (No login required)
  if (!userRole) {
    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("userRole", "CUSTOMER");
    sessionStorage.setItem("username", "Guest");
  }
}

function login() { 
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    alert("Please enter both username and password.");
    return;
  }

  // Set active session variables to Admin status
  sessionStorage.setItem("isLoggedIn", "true");
  sessionStorage.setItem("userRole", "ADMIN");
  sessionStorage.setItem("username", username);

  window.location.href = 'index.html'; 
}

function logout() { 
  sessionStorage.clear();
  window.location.href = 'index.html'; 
}

function enforceAccessControl() {
  initializeUserSession();

  const currentPage = window.location.pathname.split('/').pop();
  const userRole = sessionStorage.getItem("userRole");

  // 1. Protect Settings page from Customers
  if (currentPage === 'settings.html' && userRole === 'CUSTOMER') {
    window.location.href = 'index.html';
    return;
  }

  // 2. If already logged in as Admin, skip the login page
  if (currentPage === 'login.html' && userRole === 'ADMIN') {
    window.location.href = 'index.html'; 
    return;
  }

  // 3. Dynamically build header depending on active profile role status
  const authHeaderZone = document.getElementById('authHeaderZone');
  if (authHeaderZone && currentPage !== 'login.html') {
    const username = sessionStorage.getItem("username");
    if (userRole === 'ADMIN') {
      authHeaderZone.innerHTML = `<span>${username} (${userRole})</span> | <button onclick="logout()" class="btn btn-danger" style="padding: 6px 12px; font-size: 14px;">Logout</button>`;
    } else {
      authHeaderZone.innerHTML = `<span>${username} (${userRole})</span> | <button onclick="window.location.href='login.html'" class="btn btn-primary" style="padding: 6px 12px; font-size: 14px;">Admin Login</button>`;
    }
  }
}

function handleRoleVisibility() {
  const userRole = sessionStorage.getItem("userRole");
  
  if (userRole === 'CUSTOMER') {
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) addProductBtn.style.display = 'none';

    const actionHeader = document.getElementById('actionHeader');
    if (actionHeader) actionHeader.style.display = 'none';

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.style.display = 'none';
  }
}

// ==========================================
// 3. DATA RENDERING
// ==========================================

function getStatus(qty, exp) { 
  const daysLeft = Math.ceil((new Date(exp) - new Date()) / (1000*60*60*24)); 
  if(qty <= 0 || daysLeft <= 7) return {color:'red', text:'Critical/Near Expiry'}; 
  if(qty <= lowStockThreshold) return {color:'yellow', text:'Low Stock'}; 
  return {color:'green', text:'High Stock'}; 
}

function renderAll() { 
  handleRoleVisibility();
  if (document.querySelector('#productTable tbody')) renderProducts(); 
  if (document.getElementById('alertsList')) renderAlerts(); 
  if (document.querySelector('#expiryTable tbody')) renderExpiry(); 
  if (document.getElementById('totalProducts')) updateSettingsInfo();
}

function renderProducts() { 
  const tbody = document.querySelector('#productTable tbody'); 
  tbody.innerHTML = ''; 
  const userRole = sessionStorage.getItem("userRole");
  
  if(products.length === 0) {
    const colSpanValue = userRole === 'ADMIN' ? 6 : 5;
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
        <td>${daysLeft} days</td> 
        <td><span class="status-dot status-${status.color}"></span>${status.text}</td> 
      </tr>`; 
  }); 
}

// ==========================================
// 4. PRODUCT MANAGEMENT (ADMIN ONLY)
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

// Keep your existing closeModal(), editProduct(), saveProduct(), deleteProduct(), saveSettings(), and updateSettingsInfo() below exactly as they were...
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
  const qty = document.getElementById('prodQty').value; 
  const unit = document.getElementById('prodUnit').value; 
  const exp = document.getElementById('prodExp').value; 
  
  if(!name) { alert("Product name is required"); return; } 
  if(isNaN(qty) || qty === '' || qty < 0) { document.getElementById('qtyError').textContent = 'Invalid input, please enter a numeric value'; return; } 
  if(!exp || new Date(exp) < new Date().setHours(0,0,0,0)) { document.getElementById('expError').textContent = 'Invalid input or Product already expired.'; return; } 
  
  if(id && id !== '') { 
    const p = products.find(x => x.id == id); 
    if(p) { p.name = name; p.qty = parseInt(qty); p.unit = unit; p.exp = exp; } 
  } else { 
    products.push({id:Date.now(), name, qty:parseInt(qty), unit, exp}); 
  } 
  saveStateToStorage(); closeModal(); renderAll(); 
}

function deleteProduct(id) { 
  if(confirm("Are you sure you want to delete this product?")) { 
    products = products.filter(p => p.id !== id); saveStateToStorage(); renderAll(); 
  } 
}

function saveSettings() { 
  const newThreshold = document.getElementById('lowStockThreshold').value; 
  if(isNaN(newThreshold) || newThreshold < 1) { alert("Please enter a valid number"); return; } 
  lowStockThreshold = parseInt(newThreshold); saveStateToStorage(); alert("Settings saved!"); renderAll(); 
}

function updateSettingsInfo() { 
  document.getElementById('totalProducts').textContent = products.length; 
  const criticalCount = products.filter(p => getStatus(p.qty, p.exp).color === 'red').length; 
  document.getElementById('criticalItems').textContent = criticalCount; 
  document.getElementById('currentRoleDisplay').textContent = sessionStorage.getItem("userRole"); 
  document.getElementById('lowStockThreshold').value = lowStockThreshold; 
}

// ==========================================
// 5. INITIALIZATION
// ==========================================
enforceAccessControl();

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage !== 'login.html') {
    renderAll();
  }
});