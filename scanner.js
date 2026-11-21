let codeReader = null;
let isScanning = false;
let currentTrack = null;
let isTorchOn = false;

let lastCode = "";
let lastScanTime = 0;
const COOLDOWN_MS = 1500;

// Khởi tạo Decode Hints cho ZXing: Giới hạn định dạng mã vạch để tăng hiệu năng CPU
function getZXingHints() {
  const hints = new Map();
  const formats = [
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.QR_CODE
  ];
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
  return hints;
}

// Tải danh sách camera vào dropdown
async function loadCameraDevices() {
  const select = document.getElementById('camera-select');
  try {
    const tempReader = new ZXing.BrowserMultiFormatReader();
    const devices = await tempReader.getVideoInputDevices();
    select.innerHTML = '';

    if (devices.length === 0) {
      select.innerHTML = '<option value="">Không tìm thấy camera</option>';
      return;
    }

    devices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Camera ${index + 1}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách camera:", err);
    select.innerHTML = '<option value="">Cần cấp quyền camera</option>';
  }
}

async function startScan() {
  if (isScanning) return;

  try {
    document.getElementById('scan-status').innerText = "⏳ Đang kết nối Camera...";
    
    const hints = getZXingHints();
    codeReader = new ZXing.BrowserMultiFormatReader(hints);
    
    const selectedDeviceId = document.getElementById('camera-select').value;
    const constraints = selectedDeviceId 
      ? { video: { deviceId: { exact: selectedDeviceId } } }
      : { video: { facingMode: "environment" } };

    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('stop-btn').classList.remove('hidden');
    document.getElementById('scanner-overlay').classList.remove('hidden');
    document.getElementById('scan-status').innerText = "🟢 Đang quét mã...";
    isScanning = true;

    codeReader.decodeFromConstraints(constraints, 'video', (result, error) => {
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
    });

    // Kiểm tra khả năng bật Đèn Flash (Torch)
    setTimeout(checkTorchSupport, 1000);

  } catch (err) {
    console.error(err);
    alert("Không thể truy cập camera. Vui lòng cấp quyền sử dụng camera trong trình duyệt!");
    stopScan();
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

// Bật/Tắt Flash (Trợ sáng)
async function checkTorchSupport() {
  const videoElem = document.getElementById('video');
  if (videoElem.srcObject) {
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
    console.log("Không thể bật/tắt flash", e);
  }
}

// Âm thanh Beep + Rung
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
  } catch (e) {
    console.log("Audio không hoạt động nếu người dùng chưa tương tác");
  }
}

document.addEventListener("DOMContentLoaded", loadCameraDevices);