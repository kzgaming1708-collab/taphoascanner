// 1. Khởi tạo kết nối Supabase với API Key của bạn
const SUPABASE_URL = 'https://lfnzgiuifmxblekneeu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yTvd_2fzEnRtFkh8hZBbCg_L1y3c6tx';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Giỏ hàng lưu trên máy hiện tại
let cart = [];

// 2. Tra cứu sản phẩm từ Database Supabase dùng chung
async function fetchProductFromDB(barcode) {
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

// 3. Xử lý khi quét thành công hoặc nhập mã thủ công
async function onBarcodeDetected(barcode) {
  document.getElementById('result-code').innerText = barcode;
  
  const badge = document.getElementById('scan-badge');
  if (badge) badge.classList.remove('hidden');

  // Tìm sản phẩm trên server
  const product = await fetchProductFromDB(barcode);

  if (product) {
    // Đã có trong DB -> Thêm ngay vào giỏ hàng
    addToCart(product.barcode, product.name, product.price);
  } else {
    // Chưa có -> Mở Modal nhập sản phẩm mới
    document.getElementById('modal-barcode').innerText = barcode;
    document.getElementById('new-name').value = '';
    document.getElementById('new-price').value = '';
    document.getElementById('add-modal').classList.remove('hidden');
  }
}

// 4. Lưu sản phẩm mới lên Supabase (Dùng chung cho tất cả máy)
async function saveNewProduct() {
  const barcode = document.getElementById('modal-barcode').innerText.trim();
  const name = document.getElementById('new-name').value.trim();
  const price = Number(document.getElementById('new-price').value.trim());

  if (!name || isNaN(price) || price <= 0) {
    alert("Vui lòng nhập đầy đủ tên và giá hợp lệ!");
    return;
  }

  // Lưu hoặc cập nhật vào bảng products trên Supabase
  const { error } = await db
    .from('products')
    .upsert({ barcode, name, price });

  if (error) {
    alert("❌ Lỗi khi lưu vào máy chủ: " + error.message);
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
    cart.push({ barcode, name, price, quantity: 1 });
  }
  renderCart();
}

// 6. Hiển thị danh sách giỏ hàng
function renderCart() {
  const cartList = document.getElementById('cart-list');
  const totalQtyEl = document.getElementById('total-qty');
  const totalPriceEl = document.getElementById('total-price');

  if (cart.length === 0) {
    cartList.innerHTML = '<li class="py-4 text-gray-400 text-center italic">Chưa quét sản phẩm nào</li>';
    totalQtyEl.innerText = '0 món';
    totalPriceEl.innerText = '0 VNĐ';
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

  totalQtyEl.innerText = `${totalQty} món`;
  totalPriceEl.innerText = `${totalPrice.toLocaleString('vi-VN')} VNĐ`;
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
  document.getElementById('add-modal').classList.add('hidden');
}

function handleManualSearch() {
  const input = document.getElementById('manual-barcode-input').value.trim();
  if (input) {
    onBarcodeDetected(input);
    document.getElementById('manual-barcode-input').value = '';
  }
}
