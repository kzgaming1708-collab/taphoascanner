let cart = [];
let pendingBarcode = "";

const defaultProducts = {
  "8934563138164": { name: "Mì Hảo Hảo Tôm Chua Cay", price: 4500 },
  "8934564010018": { name: "Coca Cola 320ml", price: 10000 },
  "8934822200114": { name: "Sữa Tươi Vinamilk 220ml", price: 8500 },
  "8934561000010": { name: "Bánh Chocopie Orion 66g", price: 12000 }
};

let products = JSON.parse(localStorage.getItem('taphoa_db')) || defaultProducts;

function saveProductsToStorage() {
  localStorage.setItem('taphoa_db', JSON.stringify(products));
}

function processBarcode(barcode) {
  if (products[barcode]) {
    addToCart(barcode, products[barcode].name, products[barcode].price);
  } else {
    pendingBarcode = barcode;
    document.getElementById('modal-barcode').innerText = barcode;
    document.getElementById('new-name').value = "";
    document.getElementById('new-price').value = "";
    document.getElementById('add-modal').classList.remove('hidden');
  }
}

function handleManualSearch() {
  const query = document.getElementById('manual-barcode-input').value.trim();
  if (!query) return;

  // Tìm theo mã vạch chính xác
  if (products[query]) {
    addToCart(query, products[query].name, products[query].price);
    document.getElementById('manual-barcode-input').value = "";
    return;
  }

  // Tìm theo tên tương đối
  const foundBarcode = Object.keys(products).find(code => 
    products[code].name.toLowerCase().includes(query.toLowerCase())
  );

  if (foundBarcode) {
    addToCart(foundBarcode, products[foundBarcode].name, products[foundBarcode].price);
    document.getElementById('manual-barcode-input').value = "";
  } else {
    // Nếu nhập mã mới chưa có trong kho
    processBarcode(query);
  }
}

function saveNewProduct() {
  const name = document.getElementById('new-name').value.trim();
  const price = parseInt(document.getElementById('new-price').value);

  if (!name || isNaN(price) || price < 0) {
    alert("Vui lòng nhập tên và giá hợp lệ!");
    return;
  }

  products[pendingBarcode] = { name, price };
  saveProductsToStorage();
  addToCart(pendingBarcode, name, price);
  closeModal();
}

function closeModal() {
  document.getElementById('add-modal').classList.add('hidden');
}

function addToCart(barcode, name, price) {
  const existingItem = cart.find(item => item.barcode === barcode);
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cart.push({ barcode, name, price, qty: 1 });
  }
  renderCart();
}

function updateQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  renderCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const cartList = document.getElementById('cart-list');
  let total = 0;
  let totalQtyCount = 0;

  if (cart.length === 0) {
    cartList.innerHTML = '<li class="py-4 text-gray-400 text-center italic">Chưa quét sản phẩm nào</li>';
    document.getElementById('total-price').innerText = '0 VNĐ';
    document.getElementById('total-qty').innerText = '0 món';
    return;
  }

  cartList.innerHTML = cart.map((item, index) => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    totalQtyCount += item.qty;

    return `
      <li class="py-2.5 flex justify-between items-center">
        <div class="flex-1 pr-2 overflow-hidden">
          <div class="font-medium text-gray-800 truncate">${item.name}</div>
          <div class="text-xs text-gray-400 font-mono">${item.price.toLocaleString('vi-VN')}đ</div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center border rounded-lg bg-gray-50">
            <button onclick="updateQty(${index}, -1)" class="px-2 py-0.5 text-gray-600 hover:bg-gray-200 font-bold rounded-l">-</button>
            <span class="px-2 font-semibold text-xs text-gray-800">${item.qty}</span>
            <button onclick="updateQty(${index}, 1)" class="px-2 py-0.5 text-gray-600 hover:bg-gray-200 font-bold rounded-r">+</button>
          </div>
          <span class="font-bold text-gray-800 font-mono min-w-[70px] text-right">${itemTotal.toLocaleString('vi-VN')}đ</span>
          <button onclick="removeItem(${index})" class="text-red-400 hover:text-red-600 ml-1 font-bold text-xs">✕</button>
        </div>
      </li>
    `;
  }).join('');

  document.getElementById('total-price').innerText = `${total.toLocaleString('vi-VN')} VNĐ`;
  document.getElementById('total-qty').innerText = `${totalQtyCount} món`;
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm("Bạn có chắc muốn xóa toàn bộ đơn hàng hiện tại?")) {
    cart = [];
    renderCart();
  }
}

function checkout() {
  if (cart.length === 0) {
    alert("Giỏ hàng đang trống!");
    return;
  }
  alert(`Thanh toán thành công!\nTổng hóa đơn: ${document.getElementById('total-price').innerText}`);
  cart = [];
  renderCart();
}

// In Hóa Đơn Chuẩn K80
function printReceipt() {
  if (cart.length === 0) {
    alert("Giỏ hàng đang trống!");
    return;
  }

  const receiptElem = document.getElementById('printable-receipt');
  const now = new Date().toLocaleString('vi-VN');
  let total = 0;

  let itemsHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    return `
      <tr>
        <td style="padding: 4px 0;">${item.name}</td>
        <td style="text-align: center;">${item.qty}</td>
        <td style="text-align: right;">${itemTotal.toLocaleString('vi-VN')}</td>
      </tr>
    `;
  }).join('');

  receiptElem.innerHTML = `
    <div style="text-align: center; margin-bottom: 10px;">
      <h2 style="font-size: 16px; font-weight: bold; margin: 0;">TẠP HÓA WEB PRO</h2>
      <p style="margin: 2px 0;">Thời gian: ${now}</p>
      <p style="margin: 0;">--------------------------------</p>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 1px dashed #000;">
          <th style="text-align: left;">Tên SP</th>
          <th style="text-align: center;">SL</th>
          <th style="text-align: right;">T.Tiền</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
    <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; text-align: right;">
      <p style="font-size: 14px; font-weight: bold; margin: 0;">TỔNG TIỀN: ${total.toLocaleString('vi-VN')} VNĐ</p>
    </div>
    <div style="text-align: center; margin-top: 15px;">
      <p style="margin: 0;">Cảm ơn quý khách & Hẹn gặp lại!</p>
    </div>
  `;

  window.print();
}

// Xuất/Nhập dữ liệu kho hàng (JSON)
function exportCatalog() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `kho_hang_tap_hoa_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importCatalog() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = readerEvent => {
      try {
        const content = JSON.parse(readerEvent.target.result);
        products = { ...products, ...content };
        saveProductsToStorage();
        alert("Đã cập nhật danh mục sản phẩm vào hệ thống!");
      } catch (err) {
        alert("File JSON không hợp lệ!");
      }
    };
  };
  input.click();
}