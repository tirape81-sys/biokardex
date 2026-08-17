// State variables
let reagents = [];
let transactions = [];
let materials = [];
let materialTransactions = [];
let syncUrl = '';
let syncStatus = 'local'; // 'local' | 'syncing' | 'synced' | 'error'
let currentTheme = 'dark';
let consumptionChart = null;

// DOM Elements
const bodyEl = document.body;
const themeToggleBtn = document.getElementById('theme-toggle');
const liveDateEl = document.getElementById('live-date');
const viewTitleEl = document.getElementById('view-title');
const viewSubtitleEl = document.getElementById('view-subtitle');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Set current date
    const today = new Date();
    liveDateEl.textContent = formatDate(today.toISOString().split('T')[0]);
    
    // Set default dates in forms
    const todayISO = today.toISOString().split('T')[0];
    document.getElementById('ingreso-fecha').value = todayISO;
    document.getElementById('consumo-fecha').value = todayISO;
    document.getElementById('mat-ingreso-fecha').value = todayISO;
    document.getElementById('mat-consumo-fecha').value = todayISO;

    // Load theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // Initialize Lucide Icons
    lucide.createIcons();

    // Check authentication
    checkAuthentication();
});

// Authentication Gate Logic
function checkAuthentication() {
    const isAuth = sessionStorage.getItem('biokardex_auth') === 'true';
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (isAuth) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
        
        loadData();
        setupEventListeners();
        renderAll();
    } else {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        
        setupLoginListeners();
    }
}

function setupLoginListeners() {
    const formLogin = document.getElementById('form-login');
    const passwordInput = document.getElementById('login-password');
    const togglePasswordBtn = document.getElementById('btn-toggle-password');
    const loginCard = document.getElementById('login-card');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle icon dynamically
            const icon = togglePasswordBtn.querySelector('i');
            if (icon) {
                if (type === 'text') {
                    icon.setAttribute('data-lucide', 'eye-off');
                } else {
                    icon.setAttribute('data-lucide', 'eye');
                }
                lucide.createIcons();
            }
        });
    }

    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = passwordInput.value;
            
            if (password === 'Evelin08') {
                // Save session auth state
                sessionStorage.setItem('biokardex_auth', 'true');
                
                // Exit animations
                if (loginCard) {
                    loginCard.style.transform = 'scale(0.95)';
                    loginCard.style.opacity = '0';
                    loginCard.style.transition = 'all 0.3s ease-in-out';
                }
                
                const loginScreen = document.getElementById('login-screen');
                if (loginScreen) {
                    loginScreen.style.opacity = '0';
                    loginScreen.style.transition = 'opacity 0.4s ease-in-out';
                }

                setTimeout(() => {
                    const appContainer = document.getElementById('app-container');
                    if (loginScreen) loginScreen.style.display = 'none';
                    if (appContainer) appContainer.style.display = 'flex';
                    
                    // Initialize application
                    loadData();
                    setupEventListeners();
                    renderAll();
                }, 400);

                showToast('Acceso concedido. ¡Bienvenido!', 'success');
            } else {
                showToast('Clave incorrecta', 'error');
                
                // Shake feedback animation
                if (loginCard) {
                    loginCard.classList.add('shake');
                    setTimeout(() => {
                        loginCard.classList.remove('shake');
                    }, 400);
                }
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }
}

// Format Date from YYYY-MM-DD to DD/MM/YYYY
function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Set Theme (light / dark)
function setTheme(theme) {
    currentTheme = theme;
    bodyEl.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeText = document.querySelector('.theme-text');
    if (theme === 'light') {
        themeText.textContent = 'Modo Oscuro';
    } else {
        themeText.textContent = 'Modo Claro';
    }

    // Re-render chart if it exists to match theme colors
    if (consumptionChart) {
        renderConsumptionChart();
    }
}

// Load Data from LocalStorage (or set initial defaults)
function loadData() {
    const savedReagents = localStorage.getItem('biokardex_reagents');
    const savedTransactions = localStorage.getItem('biokardex_transactions');
    const savedMaterials = localStorage.getItem('biokardex_materials');
    const savedMatTransactions = localStorage.getItem('biokardex_mat_transactions');

    // Load Reagents
    if (savedReagents && savedTransactions) {
        reagents = JSON.parse(savedReagents);
        transactions = JSON.parse(savedTransactions);
    } else {
        // Pre-populate with default laboratory data from user image
        reagents = [
            { id: 'reag_eter_petroleo', name: 'ETER PETROLEO', cas: '8032-32-4', unit: 'ml', minStock: 1000 }
        ];

        transactions = [
            {
                id: 'tx_init_1',
                date: '2026-07-22',
                expDate: '2029-01-31',
                reagentId: 'reag_eter_petroleo',
                reagentName: 'ETER PETROLEO',
                lote: 'K57210575',
                type: 'ingreso',
                ingreso: 4000,
                nAnalis: null,
                consumoXAnalis: null,
                egreso: null,
                stock: 4000,
                recuperado: null,
                consumoNeto: null,
                obs: 'Ingreso inicial del lote'
            },
            {
                id: 'tx_init_2',
                date: '2026-07-28',
                expDate: '2029-01-31',
                reagentId: 'reag_eter_petroleo',
                reagentName: 'ETER PETROLEO',
                lote: 'K57210575',
                type: 'consumo',
                ingreso: null,
                nAnalis: 6,
                consumoXAnalis: 100,
                egreso: 600,
                stock: 3400,
                recuperado: 300,
                consumoNeto: 300,
                obs: 'Consumo por análisis de rutina'
            }
        ];
    }

    // Load Materials
    if (savedMaterials && savedMatTransactions) {
        materials = JSON.parse(savedMaterials);
        materialTransactions = JSON.parse(savedMatTransactions);
    } else {
        // Pre-populate with materials data from user second image
        materials = [
            { id: 'mat_guantes_nitrilo', name: 'GUANTES DE NITRILO', unit: 'CAJAS', minStock: 1 },
            { id: 'mat_vasos_precipitacion_1000ml', name: 'VASOS DE PRECIPITACION 1000ML', unit: 'UNIDS', minStock: 2 }
        ];

        materialTransactions = [
            {
                id: 'mat_tx_1',
                date: '2026-08-01',
                materialId: 'mat_guantes_nitrilo',
                materialName: 'GUANTES DE NITRILO',
                type: 'ingreso',
                ingreso: 3,
                ingresoUnid: 'CAJAS',
                consumo: null,
                consumoUnid: '',
                stock: 3,
                obs: 'Stock inicial de guantes'
            },
            {
                id: 'mat_tx_2',
                date: '2026-08-04',
                materialId: 'mat_vasos_precipitacion_1000ml',
                materialName: 'VASOS DE PRECIPITACION 1000ML',
                type: 'ingreso',
                ingreso: 6,
                ingresoUnid: 'UNIDS',
                consumo: null,
                consumoUnid: '',
                stock: 6,
                obs: 'Ingreso inicial vasos de precipitación'
            },
            {
                id: 'mat_tx_3',
                date: '2026-08-10',
                materialId: 'mat_guantes_nitrilo',
                materialName: 'GUANTES DE NITRILO',
                type: 'consumo',
                ingreso: null,
                ingresoUnid: '',
                consumo: 1,
                consumoUnid: 'CAJAS',
                stock: 2,
                obs: 'Consumo diario en laboratorio'
            },
            {
                id: 'mat_tx_4',
                date: '2026-08-15',
                materialId: 'mat_vasos_precipitacion_1000ml',
                materialName: 'VASOS DE PRECIPITACION 1000ML',
                type: 'consumo',
                ingreso: null,
                ingresoUnid: '',
                consumo: 1,
                consumoUnid: 'UNIDS',
                stock: 5,
                obs: 'Vaso roto durante análisis de rutina'
            }
        ];
    }

    // Save locally
    localStorage.setItem('biokardex_reagents', JSON.stringify(reagents));
    localStorage.setItem('biokardex_transactions', JSON.stringify(transactions));
    localStorage.setItem('biokardex_materials', JSON.stringify(materials));
    localStorage.setItem('biokardex_mat_transactions', JSON.stringify(materialTransactions));
    
    // Recalculate stocks for reagents and materials
    recalculateLedger();
    recalculateMatLedger();

    // Check for Google Sheets sync URL and pre-configure user's deployed URL
    if (localStorage.getItem('biokardex_sync_url') === null) {
        localStorage.setItem('biokardex_sync_url', 'https://script.google.com/macros/s/AKfycbzcZjWj1pPw-ICUVovrHa82JgzjFd_ukU6pKqxLqLu6fyd_nenXjJgYyMKSCfZDc4qk4g/exec');
    }
    syncUrl = localStorage.getItem('biokardex_sync_url') || '';
    if (syncUrl) {
        fetchFromSheets();
    } else {
        updateSyncUI('local');
    }
}

function saveDataToStorage() {
    localStorage.setItem('biokardex_reagents', JSON.stringify(reagents));
    localStorage.setItem('biokardex_transactions', JSON.stringify(transactions));
    localStorage.setItem('biokardex_materials', JSON.stringify(materials));
    localStorage.setItem('biokardex_mat_transactions', JSON.stringify(materialTransactions));
    
    // Trigger background sync if connected
    if (syncUrl) {
        pushToSheets();
    }
}

// Recalculates the stock for each reagent transaction based on chronological order
function recalculateLedger() {
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    const stockMap = {};

    transactions.forEach(tx => {
        const key = `${tx.reagentId}_${tx.lote}`;
        if (stockMap[key] === undefined) {
            stockMap[key] = 0;
        }

        if (tx.type === 'ingreso') {
            stockMap[key] += Number(tx.ingreso);
        } else if (tx.type === 'consumo') {
            stockMap[key] -= Number(tx.egreso);
        }
        
        tx.stock = stockMap[key];
    });

    saveDataToStorage();
}

// Recalculates the stock for each material transaction based on chronological order
function recalculateMatLedger() {
    materialTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    const stockMap = {};

    materialTransactions.forEach(tx => {
        const key = tx.materialId;
        if (stockMap[key] === undefined) {
            stockMap[key] = 0;
        }

        if (tx.type === 'ingreso') {
            stockMap[key] += Number(tx.ingreso);
        } else if (tx.type === 'consumo') {
            stockMap[key] -= Number(tx.consumo);
        }
        
        tx.stock = stockMap[key];
    });

    saveDataToStorage();
}

// Computes current active inventory state (reagents and their batches)
function getInventoryState() {
    const inventory = {};

    reagents.forEach(r => {
        inventory[r.id] = {
            id: r.id,
            name: r.name,
            cas: r.cas,
            unit: r.unit,
            minStock: r.minStock,
            totalStock: 0,
            batches: {}
        };
    });

    transactions.forEach(tx => {
        if (!inventory[tx.reagentId]) return;

        const reg = inventory[tx.reagentId];
        const key = tx.lote;

        if (!reg.batches[key]) {
            reg.batches[key] = {
                lote: tx.lote,
                expDate: tx.expDate || '',
                stock: 0
            };
        }

        if (tx.type === 'ingreso') {
            reg.batches[key].stock += Number(tx.ingreso);
        } else if (tx.type === 'consumo') {
            reg.batches[key].stock -= Number(tx.egreso);
        }
    });

    Object.values(inventory).forEach(reg => {
        reg.totalStock = Object.values(reg.batches).reduce((sum, batch) => sum + batch.stock, 0);
    });

    return inventory;
}

// Computes current active materials inventory state
function getMatInventoryState() {
    const inventory = {};

    materials.forEach(m => {
        inventory[m.id] = {
            id: m.id,
            name: m.name,
            unit: m.unit,
            minStock: m.minStock,
            totalStock: 0
        };
    });

    materialTransactions.forEach(tx => {
        if (!inventory[tx.materialId]) return;

        if (tx.type === 'ingreso') {
            inventory[tx.materialId].totalStock += Number(tx.ingreso);
        } else if (tx.type === 'consumo') {
            inventory[tx.materialId].totalStock -= Number(tx.consumo);
        }
    });

    return inventory;
}

// Setup Event Listeners
function setupEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener('click', () => {
        const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(targetTheme);
    });

    // Reagent form inputs changes to auto-calculate values
    const nAnalisInput = document.getElementById('consumo-n-analis');
    const xAnalisInput = document.getElementById('consumo-x-analis');
    const egresoInput = document.getElementById('consumo-egreso');
    const recuperadoInput = document.getElementById('consumo-recuperado');
    const netoInput = document.getElementById('consumo-neto');

    function calculateConsumos() {
        const nAnalis = Number(nAnalisInput.value) || 0;
        const xAnalis = Number(xAnalisInput.value) || 0;
        const egreso = nAnalis * xAnalis;
        egresoInput.value = egreso > 0 ? egreso : '';

        const recuperado = Number(recuperadoInput.value) || 0;
        const neto = Math.max(0, egreso - recuperado);
        netoInput.value = egreso > 0 ? neto : '';
    }

    nAnalisInput.addEventListener('input', calculateConsumos);
    xAnalisInput.addEventListener('input', calculateConsumos);
    recuperadoInput.addEventListener('input', calculateConsumos);

    // Reagent selection loads lotes
    const consumoReagentSelect = document.getElementById('consumo-reactivo');
    consumoReagentSelect.addEventListener('change', () => {
        updateConsumoLoteDropdown(consumoReagentSelect.value);
    });

    // Lote selection updates stock indicator
    const consumoLoteSelect = document.getElementById('consumo-lote');
    consumoLoteSelect.addEventListener('change', () => {
        updateLoteStockIndicator();
    });

    // Materials form dynamic unit autofill
    const matIngresoSelect = document.getElementById('mat-ingreso-id');
    matIngresoSelect.addEventListener('change', () => {
        const mat = materials.find(m => m.id === matIngresoSelect.value);
        document.getElementById('mat-ingreso-unidad').value = mat ? mat.unit : '';
    });

    const matConsumoSelect = document.getElementById('mat-consumo-id');
    matConsumoSelect.addEventListener('change', () => {
        const mat = materials.find(m => m.id === matConsumoSelect.value);
        document.getElementById('mat-consumo-unidad').value = mat ? mat.unit : '';
        updateMatStockIndicator();
    });

    // Submit forms
    document.getElementById('form-ingreso').addEventListener('submit', handleIngresoSubmit);
    document.getElementById('form-consumo').addEventListener('submit', handleConsumoSubmit);
    document.getElementById('form-new-reagent').addEventListener('submit', handleNewReagentSubmit);

    // Submit forms (Materiales)
    document.getElementById('form-mat-ingreso').addEventListener('submit', handleMatIngresoSubmit);
    document.getElementById('form-mat-consumo').addEventListener('submit', handleMatConsumoSubmit);
    document.getElementById('form-new-material').addEventListener('submit', handleNewMaterialSubmit);

    // Filters event listeners (Reactivos)
    document.getElementById('filter-reagent').addEventListener('change', renderKardexTable);
    document.getElementById('filter-type').addEventListener('change', renderKardexTable);
    document.getElementById('filter-lote').addEventListener('input', renderKardexTable);
    document.getElementById('btn-clear-filters').addEventListener('click', clearFilters);

    // Filters event listeners (Materiales)
    document.getElementById('filter-mat').addEventListener('change', renderMatKardexTable);
    document.getElementById('filter-mat-type').addEventListener('change', renderMatKardexTable);
    document.getElementById('btn-clear-mat-filters').addEventListener('click', clearMatFilters);

    // CSV Exports
    document.getElementById('btn-export-csv').addEventListener('click', exportToCSV);
    document.getElementById('btn-export-mat-csv').addEventListener('click', exportMatToCSV);

    // Backup & Restore
    document.getElementById('btn-backup-json').addEventListener('click', backupDatabase);
    document.getElementById('import-file').addEventListener('change', restoreDatabase);

    // Google Sheets Sync Settings
    document.getElementById('form-sync-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('sync-url').value.trim();
        
        if (!url) return;
        
        syncUrl = url;
        localStorage.setItem('biokardex_sync_url', url);
        
        closeSyncModal();
        showToast('Conectando a Google Sheets...', 'info');
        
        await fetchFromSheets();
        
        // Push current local state to the cloud to initialize if it was empty, or sync up
        if (syncStatus === 'synced') {
            await pushToSheets();
        }
    });
}

// Display lotes for Reactivo
function updateConsumoLoteDropdown(reagentId) {
    const loteSelect = document.getElementById('consumo-lote');
    const stockIndicator = document.getElementById('lote-stock-indicator');
    
    loteSelect.innerHTML = '';
    stockIndicator.textContent = '';

    if (!reagentId) {
        loteSelect.innerHTML = '<option value="">Seleccione primero un reactivo...</option>';
        loteSelect.disabled = true;
        return;
    }

    const inventory = getInventoryState();
    const reagentData = inventory[reagentId];

    if (!reagentData || Object.keys(reagentData.batches).length === 0) {
        loteSelect.innerHTML = '<option value="">No hay lotes con stock para este reactivo</option>';
        loteSelect.disabled = true;
        return;
    }

    loteSelect.innerHTML = '<option value="">Seleccione un lote...</option>';
    
    const batches = Object.values(reagentData.batches).filter(b => b.stock > 0);

    if (batches.length === 0) {
        loteSelect.innerHTML = '<option value="">No hay lotes activos con stock disponible</option>';
        loteSelect.disabled = true;
        return;
    }

    batches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.lote;
        opt.textContent = `${b.lote} (Stock: ${b.stock.toFixed(1)} ${reagentData.unit} | Vence: ${formatDate(b.expDate)})`;
        loteSelect.appendChild(opt);
    });

    loteSelect.disabled = false;
}

// Show current stock status for reagent lote
function updateLoteStockIndicator() {
    const reagentId = document.getElementById('consumo-reactivo').value;
    const lote = document.getElementById('consumo-lote').value;
    const stockIndicator = document.getElementById('lote-stock-indicator');

    if (!reagentId || !lote) {
        stockIndicator.textContent = '';
        return;
    }

    const inventory = getInventoryState();
    const batch = inventory[reagentId]?.batches[lote];
    const unit = inventory[reagentId]?.unit || '';

    if (batch) {
        stockIndicator.textContent = `Stock disponible: ${batch.stock.toFixed(1)} ${unit}`;
        stockIndicator.style.color = batch.stock <= 0 ? 'var(--danger)' : 'var(--success)';
    } else {
        stockIndicator.textContent = '';
    }
}

// Show current stock status for material
function updateMatStockIndicator() {
    const matId = document.getElementById('mat-consumo-id').value;
    const indicator = document.getElementById('mat-stock-indicator');

    if (!matId) {
        indicator.textContent = '';
        return;
    }

    const inventory = getMatInventoryState();
    const mat = inventory[matId];

    if (mat) {
        indicator.textContent = `Stock disponible: ${mat.totalStock} ${mat.unit}`;
        indicator.style.color = mat.totalStock <= 0 ? 'var(--danger)' : 'var(--success)';
    } else {
        indicator.textContent = '';
    }
}

// Clear filters
function clearFilters() {
    document.getElementById('filter-reagent').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-lote').value = '';
    renderKardexTable();
}

function clearMatFilters() {
    document.getElementById('filter-mat').value = '';
    document.getElementById('filter-mat-type').value = '';
    renderMatKardexTable();
}

// Navigation between views
function switchView(viewId) {
    // Update active nav-menu item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetNav = document.getElementById(`nav-${viewId}`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    // Update active view section
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${viewId}-view`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Set view headers
    let title = 'Dashboard';
    let subtitle = 'Resumen general del inventario de reactivos';
    
    if (viewId === 'kardex') {
        title = 'Kardex Completo';
        subtitle = 'Historial completo de entradas y salidas de reactivos';
        renderKardexTable();
    } else if (viewId === 'transaction') {
        title = 'Nueva Transacción';
        subtitle = 'Registra ingresos o egresos de análisis en el inventario';
        populateFormDropdowns();
    } else if (viewId === 'inventory') {
        title = 'Control de Stock';
        subtitle = 'Detalle de lotes físicos y alertas de vencimiento';
        renderInventoryCards();
    } else if (viewId === 'dashboard') {
        renderDashboardStats();
        renderConsumptionChart();
        renderRecentTransactions();
    } else if (viewId === 'mat-kardex') {
        title = 'Kardex de Materiales';
        subtitle = 'Historial de movimientos para insumos generales';
        renderMatKardexTable();
    } else if (viewId === 'mat-transaction') {
        title = 'Movimiento de Insumos';
        subtitle = 'Registra entradas o consumos de insumos de laboratorio';
        populateMatDropdowns();
    } else if (viewId === 'mat-inventory') {
        title = 'Inventario de Insumos';
        subtitle = 'Control de stock físico de materiales generales';
        renderMatInventoryCards();
    }

    viewTitleEl.textContent = title;
    viewSubtitleEl.textContent = subtitle;
}

// Switch between tabs in transaction views
function switchTab(tabId) {
    document.querySelectorAll('#transaction-view .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('#transaction-view .tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const activeBtn = Array.from(document.querySelectorAll('#transaction-view .tab-btn')).find(b => b.outerHTML.includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

function switchMatTab(tabId) {
    document.querySelectorAll('#mat-transaction-view .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('#mat-transaction-view .tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const activeBtn = document.getElementById(tabId === 'tab-mat-ingreso' ? 'tab-btn-mat-ingreso' : 'tab-btn-mat-consumo');
    if (activeBtn) activeBtn.classList.add('active');
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

// Populates dropdown selectors with active reagents
function populateFormDropdowns() {
    const ingresoSelect = document.getElementById('ingreso-reactivo');
    const consumoSelect = document.getElementById('consumo-reactivo');
    const filterSelect = document.getElementById('filter-reagent');

    const htmlOpts = reagents.map(r => `<option value="${r.id}">${r.name} ${r.cas ? `(${r.cas})` : ''}</option>`).join('');
    
    ingresoSelect.innerHTML = '<option value="">Seleccione un reactivo...</option>' + htmlOpts;
    consumoSelect.innerHTML = '<option value="">Seleccione un reactivo...</option>' + htmlOpts;
    filterSelect.innerHTML = '<option value="">Todos los reactivos</option>' + htmlOpts;
}

// Populates dropdown selectors with active materials
function populateMatDropdowns() {
    const matIngresoSelect = document.getElementById('mat-ingreso-id');
    const matConsumoSelect = document.getElementById('mat-consumo-id');
    const matFilterSelect = document.getElementById('filter-mat');

    const htmlOpts = materials.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

    matIngresoSelect.innerHTML = '<option value="">Seleccione un material...</option>' + htmlOpts;
    matConsumoSelect.innerHTML = '<option value="">Seleccione un material...</option>' + htmlOpts;
    matFilterSelect.innerHTML = '<option value="">Todos los materiales</option>' + htmlOpts;
}

// Modal management
function openNewReagentModal() {
    document.getElementById('reagent-modal').classList.add('active');
}

function closeNewReagentModal() {
    document.getElementById('reagent-modal').classList.remove('active');
    document.getElementById('form-new-reagent').reset();
}

function openNewMaterialModal() {
    document.getElementById('material-modal').classList.add('active');
}

function closeNewMaterialModal() {
    document.getElementById('material-modal').classList.remove('active');
    document.getElementById('form-new-material').reset();
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-octagon';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Submit Handlers (Reactivos)
function handleNewReagentSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-reagent-name').value.trim().toUpperCase();
    const cas = document.getElementById('new-reagent-cas').value.trim();
    const unit = document.getElementById('new-reagent-unit').value;
    const minStock = Number(document.getElementById('new-reagent-min-stock').value) || 0;

    if (reagents.some(r => r.name === name)) {
        showToast('Ya existe un reactivo con este nombre', 'error');
        return;
    }

    const newReagent = {
        id: 'reag_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name,
        cas,
        unit,
        minStock
    };

    reagents.push(newReagent);
    saveDataToStorage();
    populateFormDropdowns();
    closeNewReagentModal();
    showToast(`Reactivo ${name} registrado con éxito`, 'success');
}

function handleIngresoSubmit(e) {
    e.preventDefault();
    const reagentId = document.getElementById('ingreso-reactivo').value;
    const lote = document.getElementById('ingreso-lote').value.trim().toUpperCase();
    const cantidad = Number(document.getElementById('ingreso-cantidad').value);
    const date = document.getElementById('ingreso-fecha').value;
    const expDate = document.getElementById('ingreso-caducidad').value;
    const obs = document.getElementById('ingreso-obs').value.trim();

    const reagent = reagents.find(r => r.id === reagentId);

    const tx = {
        id: 'tx_' + Date.now(),
        date,
        expDate,
        reagentId,
        reagentName: reagent.name,
        lote,
        type: 'ingreso',
        ingreso: cantidad,
        nAnalis: null,
        consumoXAnalis: null,
        egreso: null,
        stock: 0,
        recuperado: null,
        consumoNeto: null,
        obs
    };

    transactions.push(tx);
    recalculateLedger();
    document.getElementById('form-ingreso').reset();
    
    const todayISO = new Date().toISOString().split('T')[0];
    document.getElementById('ingreso-fecha').value = todayISO;
    document.getElementById('ingreso-caducidad').value = '';

    showToast('Ingreso de inventario registrado correctamente', 'success');
}

function handleConsumoSubmit(e) {
    e.preventDefault();
    const reagentId = document.getElementById('consumo-reactivo').value;
    const lote = document.getElementById('consumo-lote').value;
    const date = document.getElementById('consumo-fecha').value;
    const nAnalis = Number(document.getElementById('consumo-n-analis').value);
    const consumoXAnalis = Number(document.getElementById('consumo-x-analis').value);
    const recuperadoVal = document.getElementById('consumo-recuperado').value;
    const recuperado = recuperadoVal !== '' ? Number(recuperadoVal) : null;
    const obs = document.getElementById('consumo-obs').value.trim();

    const reagent = reagents.find(r => r.id === reagentId);
    const egreso = nAnalis * consumoXAnalis;
    const consumoNeto = egreso - (recuperado || 0);

    const inventory = getInventoryState();
    const batch = inventory[reagentId]?.batches[lote];

    if (!batch || batch.stock < egreso) {
        const avail = batch ? batch.stock : 0;
        showToast(`Stock insuficiente en el lote ${lote}. Disponible: ${avail.toFixed(1)} ${reagent.unit}`, 'error');
        return;
    }

    const tx = {
        id: 'tx_' + Date.now(),
        date,
        expDate: batch.expDate,
        reagentId,
        reagentName: reagent.name,
        lote,
        type: 'consumo',
        ingreso: null,
        nAnalis,
        consumoXAnalis,
        egreso,
        stock: 0,
        recuperado,
        consumoNeto,
        obs
    };

    transactions.push(tx);
    recalculateLedger();
    resetConsumoForm();
    showToast('Consumo de análisis registrado correctamente', 'success');
}

function resetConsumoForm() {
    document.getElementById('form-consumo').reset();
    const todayISO = new Date().toISOString().split('T')[0];
    document.getElementById('consumo-fecha').value = todayISO;
    document.getElementById('consumo-lote').disabled = true;
    document.getElementById('consumo-lote').innerHTML = '<option value="">Seleccione primero un reactivo...</option>';
    document.getElementById('lote-stock-indicator').textContent = '';
}

// Submit Handlers (Materiales)
function handleNewMaterialSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-mat-name').value.trim().toUpperCase();
    const unit = document.getElementById('new-mat-unit').value;
    const minStock = Number(document.getElementById('new-mat-min-stock').value) || 0;

    if (materials.some(m => m.name === name)) {
        showToast('Ya existe un material con este nombre', 'error');
        return;
    }

    const newMaterial = {
        id: 'mat_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name,
        unit,
        minStock
    };

    materials.push(newMaterial);
    saveDataToStorage();
    populateMatDropdowns();
    closeNewMaterialModal();
    showToast(`Material ${name} registrado con éxito`, 'success');
}

function handleMatIngresoSubmit(e) {
    e.preventDefault();
    const materialId = document.getElementById('mat-ingreso-id').value;
    const cantidad = Number(document.getElementById('mat-ingreso-cantidad').value);
    const date = document.getElementById('mat-ingreso-fecha').value;
    const obs = document.getElementById('mat-ingreso-obs').value.trim();

    const mat = materials.find(m => m.id === materialId);

    const tx = {
        id: 'mat_tx_' + Date.now(),
        date,
        materialId,
        materialName: mat.name,
        type: 'ingreso',
        ingreso: cantidad,
        ingresoUnid: mat.unit,
        consumo: null,
        consumoUnid: '',
        stock: 0,
        obs
    };

    materialTransactions.push(tx);
    recalculateMatLedger();
    document.getElementById('form-mat-ingreso').reset();

    const todayISO = new Date().toISOString().split('T')[0];
    document.getElementById('mat-ingreso-fecha').value = todayISO;
    document.getElementById('mat-ingreso-unidad').value = '';

    showToast('Ingreso de insumo registrado correctamente', 'success');
}

function handleMatConsumoSubmit(e) {
    e.preventDefault();
    const materialId = document.getElementById('mat-consumo-id').value;
    const cantidad = Number(document.getElementById('mat-consumo-cantidad').value);
    const date = document.getElementById('mat-consumo-fecha').value;
    const obs = document.getElementById('mat-consumo-obs').value.trim();

    const mat = materials.find(m => m.id === materialId);
    const inventory = getMatInventoryState();
    const currentStock = inventory[materialId]?.totalStock || 0;

    if (currentStock < cantidad) {
        showToast(`Stock insuficiente. Disponible: ${currentStock} ${mat.unit}`, 'error');
        return;
    }

    const tx = {
        id: 'mat_tx_' + Date.now(),
        date,
        materialId,
        materialName: mat.name,
        type: 'consumo',
        ingreso: null,
        ingresoUnid: '',
        consumo: cantidad,
        consumoUnid: mat.unit,
        stock: 0,
        obs
    };

    materialTransactions.push(tx);
    recalculateMatLedger();
    resetMatConsumoForm();

    showToast('Consumo de insumo registrado correctamente', 'success');
}

function resetMatConsumoForm() {
    document.getElementById('form-mat-consumo').reset();
    const todayISO = new Date().toISOString().split('T')[0];
    document.getElementById('mat-consumo-fecha').value = todayISO;
    document.getElementById('mat-consumo-unidad').value = '';
    document.getElementById('mat-stock-indicator').textContent = '';
}

// Delete Transactions
function deleteTransaction(txId) {
    if (!confirm('¿Está seguro de que desea eliminar este registro? Esto recalculará el inventario completo.')) {
        return;
    }

    transactions = transactions.filter(t => t.id !== txId);
    recalculateLedger();
    renderKardexTable();
    showToast('Registro eliminado y Kardex recalculado', 'warning');
}

function deleteMatTransaction(txId) {
    if (!confirm('¿Está seguro de que desea eliminar este registro de insumo? Esto recalculará el stock.')) {
        return;
    }

    materialTransactions = materialTransactions.filter(t => t.id !== txId);
    recalculateMatLedger();
    renderMatKardexTable();
    showToast('Registro eliminado y Kardex de materiales recalculado', 'warning');
}

// Render Dashboard Data
function renderAll() {
    renderDashboardStats();
    renderConsumptionChart();
    renderRecentTransactions();
    populateFormDropdowns();
    populateMatDropdowns();
}

function renderDashboardStats() {
    const inventory = getInventoryState();
    
    document.getElementById('stat-total-reagents').textContent = reagents.length;

    let activeBatches = 0;
    let lowStockCount = 0;
    let expiringSoonCount = 0;

    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    Object.values(inventory).forEach(reg => {
        if (reg.totalStock < reg.minStock) {
            lowStockCount++;
        }

        Object.values(reg.batches).forEach(b => {
            if (b.stock > 0) {
                activeBatches++;

                if (b.expDate) {
                    const exp = new Date(b.expDate);
                    if (exp < today) {
                        // Expired
                    } else if (exp <= sixMonthsFromNow) {
                        expiringSoonCount++;
                    }
                }
            }
        });
    });

    // Also include materials with low stock in critical alerts count
    const matInventory = getMatInventoryState();
    Object.values(matInventory).forEach(mat => {
        if (mat.totalStock < mat.minStock) {
            lowStockCount++;
        }
    });

    document.getElementById('stat-active-batches').textContent = activeBatches;
    document.getElementById('stat-low-stock').textContent = lowStockCount;
    document.getElementById('stat-expiring-soon').textContent = expiringSoonCount;

    renderAlertsList(inventory, matInventory, sixMonthsFromNow, today);
}

function renderAlertsList(inventory, matInventory, sixMonthsFromNow, today) {
    const alertsContainer = document.getElementById('alerts-list');
    alertsContainer.innerHTML = '';
    const alertList = [];

    // Reagents stock alerts
    Object.values(inventory).forEach(reg => {
        if (reg.totalStock < reg.minStock) {
            alertList.push({
                type: 'danger',
                title: 'Stock Crítico (Reactivo)',
                desc: `${reg.name} tiene stock de ${reg.totalStock.toFixed(1)} ${reg.unit} (mínimo: ${reg.minStock} ${reg.unit}).`
            });
        }

        Object.values(reg.batches).forEach(b => {
            if (b.stock <= 0) return;

            if (b.expDate) {
                const exp = new Date(b.expDate);
                if (exp < today) {
                    alertList.push({
                        type: 'danger',
                        title: 'Lote Vencido',
                        desc: `Lote ${b.lote} de ${reg.name} venció el ${formatDate(b.expDate)} (Stock: ${b.stock.toFixed(1)} ${reg.unit}).`
                    });
                } else if (exp <= sixMonthsFromNow) {
                    alertList.push({
                        type: 'warning',
                        title: 'Próximo a Vencer',
                        desc: `Lote ${b.lote} de ${reg.name} vence el ${formatDate(b.expDate)} (Stock: ${b.stock.toFixed(1)} ${reg.unit}).`
                    });
                }
            }
        });
    });

    // Materials stock alerts
    Object.values(matInventory).forEach(mat => {
        if (mat.totalStock < mat.minStock) {
            alertList.push({
                type: 'danger',
                title: 'Stock Crítico (Insumo)',
                desc: `${mat.name} tiene stock de ${mat.totalStock} ${mat.unit} (mínimo: ${mat.minStock} ${mat.unit}).`
            });
        }
    });

    if (alertList.length === 0) {
        alertsContainer.innerHTML = `
            <div class="empty-alerts">
                <i data-lucide="check-circle-2" class="text-success"></i>
                <p>No hay alertas activas en este momento.</p>
            </div>
        `;
    } else {
        alertList.forEach(alert => {
            const item = document.createElement('div');
            item.className = `notification-item alert-${alert.type}`;
            
            const icon = alert.type === 'danger' ? 'alert-octagon' : 'alert-triangle';

            item.innerHTML = `
                <i data-lucide="${icon}" class="${alert.type === 'danger' ? 'text-danger' : 'text-warning'}"></i>
                <div class="notification-content">
                    <span class="notification-title">${alert.title}</span>
                    <span class="notification-desc">${alert.desc}</span>
                </div>
            `;
            alertsContainer.appendChild(item);
        });
    }
    lucide.createIcons();
}

function renderRecentTransactions() {
    const tbody = document.getElementById('recent-transactions-tbody');
    tbody.innerHTML = '';

    const recent = [...transactions].reverse().slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center;">No hay transacciones de reactivos registradas.</td></tr>`;
        return;
    }

    recent.forEach(tx => {
        const tr = document.createElement('tr');
        
        const typeBadge = tx.type === 'ingreso' 
            ? `<span class="badge badge-ingreso">Ingreso</span>` 
            : `<span class="badge badge-consumo">Consumo</span>`;

        const amount = tx.type === 'ingreso' ? tx.ingreso : tx.egreso;
        const reagent = reagents.find(r => r.id === tx.reagentId);
        const unit = reagent ? reagent.unit : '';

        tr.innerHTML = `
            <td>${formatDate(tx.date)}</td>
            <td class="font-semibold">${tx.reagentName}</td>
            <td><code>${tx.lote}</code></td>
            <td>${typeBadge}</td>
            <td>${amount} ${unit}</td>
            <td>${tx.stock.toFixed(1)} ${unit}</td>
            <td>${tx.type === 'consumo' ? `${tx.consumoNeto} ${unit}` : '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Render Reagents Kardex Table
function renderKardexTable() {
    const tbody = document.getElementById('kardex-tbody');
    tbody.innerHTML = '';

    const filterReagentId = document.getElementById('filter-reagent').value;
    const filterType = document.getElementById('filter-type').value;
    const filterLote = document.getElementById('filter-lote').value.trim().toUpperCase();

    const filtered = transactions.filter(tx => {
        if (filterReagentId && tx.reagentId !== filterReagentId) return false;
        if (filterType && tx.type !== filterType) return false;
        if (filterLote && !tx.lote.includes(filterLote)) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-muted" style="text-align: center; padding: 32px 0;">No se encontraron registros en el Kardex de Reactivos.</td></tr>`;
        return;
    }

    filtered.forEach(tx => {
        const tr = document.createElement('tr');
        
        const ingresoVal = tx.type === 'ingreso' ? tx.ingreso : '';
        const nAnalisVal = tx.type === 'consumo' ? tx.nAnalis : '';
        const consumoXAnalisVal = tx.type === 'consumo' ? tx.consumoXAnalis : '';
        const egresoVal = tx.type === 'consumo' ? tx.egreso : '';
        const recuperadoVal = tx.type === 'consumo' && tx.recuperado !== null ? tx.recuperado : '';
        const consumoNetoVal = tx.type === 'consumo' ? tx.consumoNeto : '';

        tr.innerHTML = `
            <td>${formatDate(tx.date)}</td>
            <td>${tx.expDate ? formatDate(tx.expDate) : '-'}</td>
            <td class="font-semibold">${tx.reagentName}</td>
            <td><code>${tx.lote}</code></td>
            <td class="text-success font-semibold">${ingresoVal}</td>
            <td>${nAnalisVal}</td>
            <td>${consumoXAnalisVal}</td>
            <td class="text-warning">${egresoVal}</td>
            <td class="font-semibold">${tx.stock.toFixed(1)}</td>
            <td class="text-primary">${recuperadoVal}</td>
            <td class="text-danger font-semibold">${consumoNetoVal}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${tx.obs}">${tx.obs || '-'}</td>
            <td class="no-print">
                <button class="btn-delete-row" onclick="deleteTransaction('${tx.id}')" title="Eliminar registro">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

// Render Materials Kardex Table
function renderMatKardexTable() {
    const tbody = document.getElementById('mat-kardex-tbody');
    tbody.innerHTML = '';

    const filterMatId = document.getElementById('filter-mat').value;
    const filterType = document.getElementById('filter-mat-type').value;

    const filtered = materialTransactions.filter(tx => {
        if (filterMatId && tx.materialId !== filterMatId) return false;
        if (filterType && tx.type !== filterType) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-muted" style="text-align: center; padding: 32px 0;">No se encontraron registros en el Kardex de Materiales.</td></tr>`;
        return;
    }

    filtered.forEach(tx => {
        const tr = document.createElement('tr');
        
        const ingresoVal = tx.type === 'ingreso' ? tx.ingreso : '';
        const ingresoUnidVal = tx.type === 'ingreso' ? tx.ingresoUnid : '';
        const consumoVal = tx.type === 'consumo' ? tx.consumo : '';
        const consumoUnidVal = tx.type === 'consumo' ? tx.consumoUnid : '';
        
        const mat = materials.find(m => m.id === tx.materialId);
        const unit = mat ? mat.unit : '';

        tr.innerHTML = `
            <td>${formatDate(tx.date)}</td>
            <td class="font-semibold">${tx.materialName}</td>
            <td class="text-success font-semibold">${ingresoVal}</td>
            <td>${ingresoUnidVal}</td>
            <td class="text-warning">${consumoVal}</td>
            <td>${consumoUnidVal}</td>
            <td class="font-semibold">${tx.stock} ${unit}</td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis;" title="${tx.obs}">${tx.obs || '-'}</td>
            <td class="no-print">
                <button class="btn-delete-row" onclick="deleteMatTransaction('${tx.id}')" title="Eliminar registro">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

// Render Physical Inventory Stock cards
function renderInventoryCards() {
    const container = document.getElementById('inventory-grid-cards');
    container.innerHTML = '';

    const inventory = getInventoryState();

    if (reagents.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-muted" style="text-align: center; padding: 40px;">No hay reactivos registrados en la base de datos. Comienza agregando uno.</div>`;
        return;
    }

    Object.values(inventory).forEach(reg => {
        const card = document.createElement('div');
        card.className = 'inventory-card';

        const isLow = reg.totalStock < reg.minStock;
        const lowBadge = isLow ? `<span class="badge badge-consumo" style="background-color: var(--danger-soft); color: var(--danger); font-size:10px;">Stock Crítico</span>` : '';

        let batchItemsHTML = '';
        const batches = Object.values(reg.batches);

        if (batches.length === 0) {
            batchItemsHTML = `<span class="text-muted" style="font-size: 11px;">Sin lotes registrados</span>`;
        } else {
            batches.forEach(b => {
                const stockColor = b.stock <= 0 ? 'var(--text-muted)' : (isLow ? 'var(--warning)' : 'var(--text-main)');
                batchItemsHTML += `
                    <div class="lot-item">
                        <div class="lot-details">
                            <span class="lot-name">Lote: ${b.lote}</span>
                            <span class="lot-exp">Caduca: ${b.expDate ? formatDate(b.expDate) : '-'}</span>
                        </div>
                        <span class="lot-stock" style="color: ${stockColor}">${b.stock.toFixed(1)} ${reg.unit}</span>
                    </div>
                `;
            });
        }

        card.innerHTML = `
            <div class="inventory-card-header">
                <div>
                    <h4 class="inventory-card-title">${reg.name}</h4>
                    ${reg.cas ? `<span class="inventory-card-cas">CAS: ${reg.cas}</span>` : ''}
                </div>
                ${lowBadge}
            </div>
            <div class="inventory-card-body">
                <div>
                    <span class="text-muted" style="font-size: 11px; display: block; font-weight: 500;">STOCK TOTAL</span>
                    <div class="total-stock-display">
                        <span class="total-stock-num" style="color: ${isLow ? 'var(--danger)' : 'var(--success)'}">${reg.totalStock.toFixed(1)}</span>
                        <span class="total-stock-unit">${reg.unit}</span>
                    </div>
                </div>
                <div>
                    <span class="text-muted" style="font-size: 11px; display: block; font-weight: 500; margin-bottom: 8px;">DESGLOSE POR LOTES</span>
                    <div class="lot-list">
                        ${batchItemsHTML}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Render Physical Materials Inventory Stock cards
function renderMatInventoryCards() {
    const container = document.getElementById('mat-inventory-grid-cards');
    container.innerHTML = '';

    const inventory = getMatInventoryState();

    if (materials.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-muted" style="text-align: center; padding: 40px;">No hay materiales registrados en la base de datos. Comienza agregando uno.</div>`;
        return;
    }

    Object.values(inventory).forEach(mat => {
        const card = document.createElement('div');
        card.className = 'inventory-card';

        const isLow = mat.totalStock < mat.minStock;
        const lowBadge = isLow ? `<span class="badge badge-consumo" style="background-color: var(--danger-soft); color: var(--danger); font-size:10px;">Stock Crítico</span>` : '';

        card.innerHTML = `
            <div class="inventory-card-header">
                <div>
                    <h4 class="inventory-card-title">${mat.name}</h4>
                    <span class="inventory-card-cas">Insumo General</span>
                </div>
                ${lowBadge}
            </div>
            <div class="inventory-card-body">
                <div>
                    <span class="text-muted" style="font-size: 11px; display: block; font-weight: 500;">STOCK DISPONIBLE</span>
                    <div class="total-stock-display">
                        <span class="total-stock-num" style="color: ${isLow ? 'var(--danger)' : 'var(--success)'}">${mat.totalStock}</span>
                        <span class="total-stock-unit">${mat.unit}</span>
                    </div>
                </div>
                <div style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; font-size: 12px;">
                    <span class="text-muted">Stock mínimo requerido: </span>
                    <span class="font-semibold">${mat.minStock} ${mat.unit}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Draw Dashboard Chart
function renderConsumptionChart() {
    const canvas = document.getElementById('consumptionChart');
    if (!canvas) return;

    if (consumptionChart) {
        consumptionChart.destroy();
    }

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthlyData = {};

    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
        months.push({
            label: label,
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        });
        monthlyData[months[months.length - 1].key] = { egreso: 0, neto: 0 };
    }

    transactions.forEach(tx => {
        if (tx.type !== 'consumo') return;
        const txDate = new Date(tx.date);
        const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[key]) {
            monthlyData[key].egreso += Number(tx.egreso || 0);
            monthlyData[key].neto += Number(tx.consumoNeto || 0);
        }
    });

    const datasets = {
        labels: months.map(m => m.label),
        egreso: months.map(m => monthlyData[m.key].egreso),
        neto: months.map(m => monthlyData[m.key].neto)
    };

    const textColor = currentTheme === 'dark' ? '#9ca3af' : '#64748b';
    const gridColor = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    const ctx = canvas.getContext('2d');
    consumptionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datasets.labels,
            datasets: [
                {
                    label: 'Consumo Bruto (Egreso)',
                    data: datasets.egreso,
                    backgroundColor: 'rgba(248, 168, 167, 0.6)',
                    borderColor: '#F8A8A7',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Consumo Neto Real',
                    data: datasets.neto,
                    backgroundColor: 'rgba(177, 239, 162, 0.6)',
                    borderColor: '#B1EFA2',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor, font: { family: 'Inter' } }
                },
                tooltip: {
                    titleFont: { family: 'Inter' },
                    bodyFont: { family: 'Inter' }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Inter' } }
                }
            }
        }
    });
}

// Export Kardex to Excel compatible CSV (Reactivos)
function exportToCSV() {
    if (transactions.length === 0) {
        showToast('No hay datos para exportar', 'error');
        return;
    }

    const headers = [
        'Fecha',
        'Fecha caducidad',
        'Reactivo',
        'Lote',
        'Ingreso',
        'N Analis',
        'Consumo X Analis',
        'Egreso',
        'Stock',
        'Recuperado',
        'Consumo Neto',
        'Observaciones'
    ];

    const rows = transactions.map(tx => [
        formatDate(tx.date),
        tx.expDate ? formatDate(tx.expDate) : '',
        tx.reagentName,
        tx.lote,
        tx.type === 'ingreso' ? tx.ingreso : '',
        tx.type === 'consumo' ? tx.nAnalis : '',
        tx.type === 'consumo' ? tx.consumoXAnalis : '',
        tx.type === 'consumo' ? tx.egreso : '',
        tx.stock.toFixed(2),
        tx.type === 'consumo' && tx.recuperado !== null ? tx.recuperado : '',
        tx.type === 'consumo' ? tx.consumoNeto : '',
        tx.obs || ''
    ]);

    let csvContent = "\uFEFF"; 
    csvContent += [headers.join(';'), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kardex_reactivos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV de reactivos descargado', 'success');
}

// Export Kardex to Excel compatible CSV (Materiales)
function exportMatToCSV() {
    if (materialTransactions.length === 0) {
        showToast('No hay datos de insumos para exportar', 'error');
        return;
    }

    const headers = [
        'Fecha',
        'Material/Insumo',
        'Ingreso',
        'Unidad Ingreso',
        'Consumo',
        'Unidad Consumo',
        'Stock',
        'Observaciones'
    ];

    const rows = materialTransactions.map(tx => [
        formatDate(tx.date),
        tx.materialName,
        tx.type === 'ingreso' ? tx.ingreso : '',
        tx.type === 'ingreso' ? tx.ingresoUnid : '',
        tx.type === 'consumo' ? tx.consumo : '',
        tx.type === 'consumo' ? tx.consumoUnid : '',
        tx.stock,
        tx.obs || ''
    ]);

    let csvContent = "\uFEFF"; 
    csvContent += [headers.join(';'), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kardex_materiales_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV de materiales descargado', 'success');
}

// Backup database to JSON
function backupDatabase() {
    const backupData = {
        reagents,
        transactions,
        materials,
        materialTransactions,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `biokardex_global_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('Copia de seguridad global JSON descargada', 'success');
}

// Restore database from JSON
function restoreDatabase(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.reagents && data.transactions) {
                reagents = data.reagents;
                transactions = data.transactions;
                
                // Load materials if present in backup, otherwise preserve or clear
                materials = data.materials || [];
                materialTransactions = data.materialTransactions || [];

                recalculateLedger();
                recalculateMatLedger();
                renderAll();
                
                showToast('Base de datos global restaurada correctamente', 'success');
            } else {
                showToast('El archivo de respaldo no tiene el formato correcto', 'error');
            }
        } catch (err) {
            showToast('Error al leer el archivo de respaldo', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
}

// ================= GOOGLE SHEETS SYNC SYSTEM =================
function openSyncModal() {
    const modal = document.getElementById('sync-modal');
    modal.classList.add('active');
    
    const urlInput = document.getElementById('sync-url');
    urlInput.value = syncUrl;
    
    const disconnectBtn = document.getElementById('btn-disconnect-sync');
    if (syncUrl) {
        disconnectBtn.classList.remove('hidden');
    } else {
        disconnectBtn.classList.add('hidden');
    }
}

function closeSyncModal() {
    document.getElementById('sync-modal').classList.remove('active');
}

function disconnectSync() {
    if (confirm('¿Está seguro de que desea desconectar la sincronización de Google Sheets? La aplicación volverá a funcionar en modo local.')) {
        syncUrl = '';
        localStorage.removeItem('biokardex_sync_url');
        updateSyncUI('local');
        closeSyncModal();
        showToast('Google Sheets desconectado. Funcionando en modo local.', 'info');
    }
}

function updateSyncUI(status) {
    syncStatus = status;
    const dot = document.getElementById('sync-status-dot');
    const text = document.getElementById('sync-status-text');
    const iconContainer = document.getElementById('sync-status-icon');
    
    if (!dot || !text || !iconContainer) return;
    
    dot.className = 'sync-dot';
    
    if (status === 'local') {
        dot.classList.add('bg-warning');
        text.textContent = 'Modo Local';
        iconContainer.outerHTML = '<i data-lucide="cloud-off" id="sync-status-icon" style="width: 14px; height: 14px;"></i>';
    } else if (status === 'syncing') {
        dot.classList.add('bg-info', 'pulse');
        text.textContent = 'Sincronizando...';
        iconContainer.outerHTML = '<i data-lucide="loader-2" class="icon-pulse" id="sync-status-icon" style="width: 14px; height: 14px;"></i>';
    } else if (status === 'synced') {
        dot.classList.add('bg-success');
        text.textContent = 'Sincronizado';
        iconContainer.outerHTML = '<i data-lucide="cloud" id="sync-status-icon" style="width: 14px; height: 14px; color: var(--success);"></i>';
    } else if (status === 'error') {
        dot.classList.add('bg-danger');
        text.textContent = 'Error Nube';
        iconContainer.outerHTML = '<i data-lucide="cloud-lightning" id="sync-status-icon" style="width: 14px; height: 14px; color: var(--danger);"></i>';
    }
    
    lucide.createIcons();
}

async function fetchFromSheets() {
    if (!syncUrl) return;
    
    updateSyncUI('syncing');
    
    try {
        const response = await fetch(syncUrl, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Accept': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            const data = result.data;
            
            // Overwrite local state if Google Sheet has records
            if (data.reagents && data.reagents.length > 0) {
                reagents = data.reagents;
                localStorage.setItem('biokardex_reagents', JSON.stringify(reagents));
            }
            
            if (data.transactions && data.transactions.length > 0) {
                transactions = data.transactions;
                localStorage.setItem('biokardex_transactions', JSON.stringify(transactions));
            }
            
            if (data.materials && data.materials.length > 0) {
                materials = data.materials;
                localStorage.setItem('biokardex_materials', JSON.stringify(materials));
            }
            
            if (data.materialTransactions && data.materialTransactions.length > 0) {
                materialTransactions = data.materialTransactions;
                localStorage.setItem('biokardex_mat_transactions', JSON.stringify(materialTransactions));
            }
            
            recalculateLedger();
            recalculateMatLedger();
            renderAll();
            
            updateSyncUI('synced');
            showToast('Datos cargados de Google Sheets con éxito', 'success');
        } else {
            updateSyncUI('error');
            showToast('Error en el Apps Script: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Fetch sheets error:', error);
        updateSyncUI('error');
        showToast('No se pudo conectar a Google Sheets. Usando datos locales.', 'warning');
    }
}

async function pushToSheets() {
    if (!syncUrl) return;
    
    updateSyncUI('syncing');
    
    const payload = {
        action: 'sync',
        reagents: reagents,
        transactions: transactions,
        materials: materials,
        materialTransactions: materialTransactions
    };
    
    try {
        const response = await fetch(syncUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            updateSyncUI('synced');
        } else {
            updateSyncUI('error');
            console.error('Apps Script Sync Error:', result.message);
        }
    } catch (error) {
        console.error('Push sheets error:', error);
        updateSyncUI('error');
        showToast('Error al enviar datos a Google Sheets. Cambios guardados localmente.', 'warning');
    }
}
