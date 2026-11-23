// 1. Khởi tạo kết nối Supabase
const SUPABASE_URL = 'https://lfnzgiuifmxblekneeu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yTvd_2fzEnRtFkh8hZBbCg_L1y3c6tx';

let db = null;
try {
  if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error("Chưa tải được thư viện Supabase JS!");
  }
} catch (e) {
  console.error("Lỗi khởi tạo Supabase:", e);
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

  // Cập nhật giao diện mã vừa quét
  const resultCodeEl = document.getElementById('result-code');
  if (resultCodeEl) resultCodeEl.innerText = barcode;
  
  const badge = document.getElementById('scan-badge');
  if (badge) badge.classList.remove('hidden');

  // Tìm sản phẩm trên server Supabase
  const product = await fetchProductFromDB(barcode);

  if (product) {
    // Đã có trong DB -> Thêm vào giỏ hàng
    addToCart(product.barcode, product.name, product.price);
  } else {
    // Chưa có -> Mở Modal nhập tên và giá tiền sản phẩm mới
    const modalBarcode = document.getElementById('modal-barcode');
    const newName = document.getElementById('new-name');
    const newPrice = document.getElementById('new-price');
    const addModal = document.getElementById('add-modal');

    if (modalBarcode) modalBarcode.innerText = barcode;
    if (newName) newName.value = '';
    if (newPrice) newPrice.value = '';
    if (addModal) addModal.classList.remove('hidden');
  }
}

// --- BỘ TƯƠNG THÍCH VỚI SCANNER.JS (Đảm bảo Camera gọi hàm nào cũng chạy) ---
window.onBarcodeDetected = onBarcodeDetected;
window.onBarcodeScanned = onBarcodeDetected;
window.handleBarcodeScanned = onBarcodeDetected;
window.onScanSuccess = onBarcodeDetected;
window.processBarcode = onBarcodeDetected;

// 4. Lưu sản phẩm mới lên Supabase (Dùng chung cho tất cả máy)
async function saveNewProduct() {
  const barcode = document.getElementById('modal-barcode').innerText.trim();
  const name = document.getElementById('new-name').value.trim();
  const priceInput = document.getElementById('new-price').value.trim();
  const price = Number(priceInput);

  if (!name || isNaN(price) || price <= 0) {
    alert("Vui lòng nhập đầy đủ tên và giá hợp lệ!");
    return;
  }

  if (!db) {
    alert("❌ Lỗi: Chưa kết nối được với Database Supabase!");
    return;
  }

  // Lưu hoặc cập nhật vào bảng products trên Supabase
  const { error } = await db
    .from('products')
    .upsert({ barcode, name, price });

  if (error) {
    alert("❌ Lỗi khi lưu vào máy chủ: " + error.message);
    console.error("Supabase error:", error);
  } else {
    alert("✅ Đã lưu sản phẩm vào cơ sở dữ liệu chung!");
    addToCart(barcode, name, price);
    closeModal();
  }
}

// 5. Thêm vào giỏ hàng cục bộ & Cập nhật giao diện
function addToCart(barcode, name, price) {
  const existingItem = cart.find(item => item.barcode === barcode);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ barcode, name, price: Number(price), quantity: 1 });
  }
  renderCart();
}

// 6. Hiển thị danh sách giỏ hàng
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

// 7. Các tiện ích phụ trợ (Thanh toán, In bill, Xuất/Nhập dữ liệu)
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
  alert("Tính năng nhập JSON trực tiếp lên DB có thể thực hiện trong trang quản trị Supabase.");
}
