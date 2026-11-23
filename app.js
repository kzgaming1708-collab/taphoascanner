// 1. Khởi tạo kết nối Supabase (Đã sửa URL chuẩn lfnzgiuifrnxblekneeu)
const SUPABASE_URL = 'https://lfnzgiuifrnxblekneeu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmbnpnaXVpZnJueGJsZWtuZWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MTg2NDMsImV4cCI6MjExMDk5NDY0M30.2thXwSgKRrdl9PbUuiiUM-Tqek0gDzAlm-dH6MVjUks';

let db = null;
try {
  if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error("Chưa tải được thư viện Supabase JS!");
  }
} catch (e) {
  console.error("Lỗi kết nối Supabase:", e);
}

// Giỏ hàng lưu trên máy hiện tại
let cart = [];

// 2. Tra cứu sản phẩm từ Database Supabase dùng chung
async function fetchProductFromDB(barcode) {
  if (!db) return null;
  try {
    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      console.error("Lỗi đọc dữ liệu:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Lỗi kết nối server:", err);
    return null;
  }
}

// 3. Xử lý chính khi phát hiện Mã vạch (Từ Camera hoặc Ô nhập tay)
async function onBarcodeDetected(barcode) {
  if (!barcode) return;
  barcode = String(barcode).trim();

  // Hiển thị mã vạch lên giao diện
  const resultCodeEl = document.getElementById('result-code');
  if (resultCodeEl) resultCodeEl.innerText = barcode;
  
  const badge = document.getElementById('scan-badge');
  if (badge) badge.classList.remove('hidden');

  // Tìm sản phẩm trên server Supabase
  const product = await fetchProductFromDB(barcode);

  if (product) {
    // Đã có trong DB -> Thêm thẳng vào giỏ hàng
    addToCart(product.barcode, product.name, product.price);
  } else {
    // Chưa có -> Mở Modal và tự điền mã vạch vào khung nhập
    const modalBarcode = document.getElementById('modal-barcode-input');
    const newName = document.getElementById('new-name');
    const newPrice = document.getElementById('new-price');
    const addModal = document.getElementById('add-modal');

    if (modalBarcode) modalBarcode.value = barcode;
    if (newName) newName.value = '';
    if (newPrice) newPrice.value = '';
    if (addModal) addModal.classList.remove('hidden');
  }
}

// --- BỘ TƯƠNG THÍCH SCANNER.JS ---
window.onBarcodeDetected = onBarcodeDetected;
window.onBarcodeScanned = onBarcodeDetected;
window.handleBarcodeScanned = onBarcodeDetected;
window.onScanSuccess = onBarcodeDetected;
window.processBarcode = onBarcodeDetected;

// 4. Mở Modal thủ công (Khi bấm nút "+ Kho")
function openAddModalDirectly() {
  const modalBarcode = document.getElementById('modal-barcode-input');
  const newName = document.getElementById('new-name');
  const newPrice = document.getElementById('new-price');
  const addModal = document.getElementById('add-modal');

  if (modalBarcode) modalBarcode.value = '';
  if (newName) newName.value = '';
  if (newPrice) newPrice.value = '';
  if (addModal) addModal.classList.remove('hidden');
}

// 5. Lưu sản phẩm mới lên Supabase DB
async function saveNewProduct() {
  const barcode = document.getElementById('modal-barcode-input').value.trim();
  const name = document.getElementById('new-name').value.trim();
  const priceInput = document.getElementById('new-price').value.trim();
  const price = Number(priceInput);

  if (!barcode || !name || isNaN(price) || price <= 0) {
    alert("⚠️ Vui lòng nhập đầy đủ Mã vạch, Tên sản phẩm và Đơn giá hợp lệ!");
    return;
  }

  if (!db) {
    alert("❌ Lỗi: Chưa kết nối được với Database Supabase!");
    return;
  }

  // Đẩy dữ liệu lưu vào bảng products trên Supabase
  const { error } = await db
    .from('products')
    .upsert([{ barcode, name, price }], { onConflict: 'barcode' });

  if (error) {
    alert("❌ Lỗi khi lưu vào máy chủ: " + error.message);
    console.error("Lỗi chi tiết Supabase:", error);
  } else {
    alert(`✅ Đã lưu sản phẩm "${name}" (${price.toLocaleString('vi-VN')} VNĐ) lên hệ thống chung!`);
    addToCart(barcode, name, price);
    closeModal();
  }
}

// 6. Thêm vào giỏ hàng cục bộ & Cập nhật giao diện
function addToCart(barcode, name, price) {
  const existingItem = cart.find(item => item.barcode === barcode);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ barcode, name, price: Number(price), quantity: 1 });
  }
  renderCart();
}

// 7. Hiển thị danh sách giỏ hàng
function renderCart() {
  const cartList = document.getElementById('cart-list');
  const totalQtyEl = document.getElementById('total-qty');
  const totalPriceEl = document.getElementById('total-price');

  if (!cartList) return;

  if (cart.length === 0) {
    cartList.innerHTML = '<li class="py-4 text-gray-400 text-center italic">Chưa quét sản phẩm nào</li>';
    if (totalQtyEl) totalQtyEl.innerText = '0 món';
    if (totalPriceEl) totalPriceEl.innerText = '0 VNĐ';
    return;
  }

  let totalQty = 0;
  let totalPrice = 0;
  cartList.innerHTML = '';

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    totalQty += item.quantity;
    totalPrice += itemTotal;

    const li = document.createElement('li');
    li.className = 'py-2 flex justify-between items-center';
    li.innerHTML = `
      <div>
        <div class="font-semibold text-gray-800">${item.name}</div>
        <div class="text-xs text-gray-500">${item.price.toLocaleString('vi-VN')} VNĐ x ${item.quantity}</div>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-blue-600">${itemTotal.toLocaleString('vi-VN')} đ</span>
        <button onclick="removeFromCart(${index})" class="text-red-500 font-bold px-1">✕</button>
      </div>
    `;
    cartList.appendChild(li);
  });

  if (totalQtyEl) totalQtyEl.innerText = `${totalQty} món`;
  if (totalPriceEl) totalPriceEl.innerText = `${totalPrice.toLocaleString('vi-VN')} VNĐ`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function closeModal() {
  const addModal = document.getElementById('add-modal');
  if (addModal) addModal.classList.add('hidden');
}

function handleManualSearch() {
  const inputEl = document.getElementById('manual-barcode-input');
  if (!inputEl) return;
  const input = inputEl.value.trim();
  if (input) {
    onBarcodeDetected(input);
    inputEl.value = '';
  }
}

// 8. Tiện ích bổ sung
function checkout() {
  if (cart.length === 0) {
    alert("Giỏ hàng đang trống!");
    return;
  }
  alert("✅ Thanh toán thành công đơn hàng!");
  clearCart();
}

function printReceipt() {
  if (cart.length === 0) {
    alert("Giỏ hàng trống, không thể in hóa đơn!");
    return;
  }
  window.print();
}

async function exportCatalog() {
  if (!db) return;
  const { data } = await db.from('products').select('*');
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data || [], null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", jsonStr);
  downloadAnchor.setAttribute("download", "danh_muc_san_pham.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importCatalog() {
  alert("Tính năng nhập kho hàng loạt có thể thực hiện trực tiếp trong trang quản trị Supabase.");
}
