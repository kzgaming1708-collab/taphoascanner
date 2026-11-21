let codeReader = null;
let isScanning = false;
let currentTrack = null;
let isTorchOn = false;

let lastCode = "";
let lastScanTime = 0;
const COOLDOWN_MS = 1500;

// Khởi tạo & xin quyền Camera trước để điện thoại hiển thị đúng tên Camera
async function loadCameraDevices() {
  const select = document.getElementById('camera-select');
  try {
    if (!codeReader) codeReader = new ZXing.BrowserMultiFormatReader();
    
    // Xin quyền tạm thời để Android/iOS giải phóng danh sách camera
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop()); // Đóng stream tạm ngay
    } catch (permErr) {
      console.warn("Chưa cấp quyền camera ban đầu:", permErr);
    }

    const videoInputDevices = await codeReader.getVideoInputDevices();
    
    select.innerHTML = '';
    if (!videoInputDevices || videoInputDevices.length === 0) {
      select.innerHTML = '<option value="">Camera Mặc Định (Tự động)</option>';
      return;
    }

    let selectedIndex = 0;
    videoInputDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Camera ${index + 1}`;
      
      const label = (device.label || '').toLowerCase();
      // Ưu tiên chọn Camera Sau trên điện thoại (Back / Rear / Environment)
      if (label.includes('back') || label.includes('rear') || label.includes('sau') || label.includes('environment') || label.includes('0')) {
        selectedIndex = index;
      }
      select.appendChild(option);
    });

    select.selectedIndex = selectedIndex;
  } catch (err) {
    console.error("Lỗi lấy danh sách camera:", err);
    select.innerHTML = '<option value="">Camera Mặc Định</option>';
  }
}

async function startScan() {
  if (isScanning) return;

  try {
    document.getElementById('scan-status').innerText = "⏳ Đang kết nối Camera...";
    if (!codeReader) codeReader = new ZXing.BrowserMultiFormatReader();

    const selectedDeviceId = document.getElementById('camera-select').value;

    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('stop-btn').classList.remove('hidden');
    document.getElementById('scanner-overlay').classList.remove('hidden');
    document.getElementById('scan-status').innerText = "🟢 Đang quét mã...";
    isScanning = true;

    // Nếu chọn được camera cụ thể từ dropdown
    if (selectedDeviceId) {
      await codeReader.decodeFromVideoDevice(selectedDeviceId, 'video', handleScanResult);
    } else {
      // Fallback cho điện thoại: Ép lấy luồng camera sau qua facingMode
      const constraints = { video: { facingMode: { ideal: "environment" } } };
      await codeReader.decodeFromConstraints(constraints, 'video', handleScanResult);
    }

    setTimeout(checkTorchSupport, 1000);

  } catch (err) {
    console.error("Lỗi mở camera:", err);
    
    // Thử lại lần cuối với cấu hình camera mặc định nếu deviceId bị từ chối trên mobile
    try {
      await codeReader.decodeFromConstraints({ video: { facingMode: "environment" } }, 'video', handleScanResult);
    } catch (fallbackErr) {
      alert("Không thể mở Camera!\nLưu ý: Trên điện thoại BẮT BUỘC phải mở bằng đường dẫn HTTPS (GitHub Pages hoặc Vercel) và đã bấm Cho Phép quyền Camera.");
      stopScan();
    }
  }
}

function handleScanResult(result, error) {
  if (result) {
    const barcode = result.getText();
    const now = Date.now();

    if (barcode === lastCode && (now - lastScanTime < COOLDOWN_MS)) {
      return;
    }

    lastCode = barcode;
    lastScanTime = now;

    document.getElementById('result-code').innerText = barcode;
    
    const badge = document.getElementById('scan-badge');
    badge.classList.remove('hidden');
    setTimeout(() => badge.classList.add('hidden'), 1000);

    processBarcode(barcode);
    playBeepAndVibrate();
  }
}

function stopScan() {
  if (codeReader) {
    codeReader.reset();
    isScanning = false;
    currentTrack = null;
    isTorchOn = false;
    document.getElementById('scan-status').innerText = "🔴 Đã dừng camera";
    document.getElementById('scanner-overlay').classList.add('hidden');
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('stop-btn').classList.add('hidden');
    document.getElementById('torch-btn').classList.add('hidden');
  }
}

async function checkTorchSupport() {
  const videoElem = document.getElementById('video');
  if (videoElem && videoElem.srcObject) {
    const track = videoElem.srcObject.getVideoTracks()[0];
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    if (capabilities.torch) {
      currentTrack = track;
      document.getElementById('torch-btn').classList.remove('hidden');
    }
  }
}

async function toggleTorch() {
  if (!currentTrack) return;
  try {
    isTorchOn = !isTorchOn;
    await currentTrack.applyConstraints({ advanced: [{ torch: isTorchOn }] });
    document.getElementById('torch-btn').classList.toggle('bg-yellow-600', isTorchOn);
  } catch (e) {
    console.log("Không bật được flash", e);
  }
}

function playBeepAndVibrate() {
  if (navigator.vibrate) {
    navigator.vibrate(100);
  }
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.value = 1200;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {}
}

document.addEventListener("DOMContentLoaded", loadCameraDevices);
