let currentProduct = null;
let currentQty = 1;

window.onload = () => {
  const saved = sessionStorage.getItem('checkoutProduct');
  if (!saved) {
    alert('ບໍ່ພົບຂໍ້ມູນສິນຄ້າ ກະລຸນາເລືອກສິນຄ້າໃໝ່');
    window.location.href = 'index.html';
    return;
  }
  currentProduct = JSON.parse(saved);
  currentQty = 1;
  updateStep1();
  loadPaymentQr();
};

function updateStep1() {
  document.getElementById('sum-img').src = currentProduct.image || '';
  document.getElementById('sum-name').textContent = currentProduct.name;
  document.getElementById('sum-price').textContent = currentProduct.price + ' ກີບ / ອັນ';
  document.getElementById('sum-qty').textContent = currentQty;
  document.getElementById('sum-total').textContent = (currentProduct.price * currentQty) + ' ກີບ';
}

function changeQty(delta) {
  const newQty = currentQty + delta;
  if (newQty < 1) return;
  if (newQty > currentProduct.stock) return;
  currentQty = newQty;
  updateStep1();
}

function goToStep(stepNumber) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById('step-' + i).classList.add('hidden');
    document.getElementById('step-indicator-' + i).classList.remove('active');
  }
  document.getElementById('step-' + stepNumber).classList.remove('hidden');
  document.getElementById('step-indicator-' + stepNumber).classList.add('active');
}

function validateStep2() {
  const phone = document.getElementById('customer-phone').value.trim();
  const address = document.getElementById('customer-address').value.trim();

  if (!phone || !address) {
    alert('ກະລຸນາໃສ່ເບີໂທ ແລະ ທີ່ຢູ່ໃຫ້ຄົບ');
    return;
  }
  goToStep(3);
}

async function loadPaymentQr() {
  const res = await fetch('/api/settings/payment-qr');
  const data = await res.json();
  const img = document.getElementById('payment-qr-img');
  const missingMsg = document.getElementById('qr-missing-msg');

  if (data.qrImage) {
    img.src = data.qrImage;
    img.classList.remove('hidden');
    missingMsg.classList.add('hidden');
  } else {
    img.classList.add('hidden');
    missingMsg.classList.remove('hidden');
  }
}

function previewSlip() {
  const fileInput = document.getElementById('slip-file');
  const preview = document.getElementById('slip-preview');
  const file = fileInput.files[0];

  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
  }
}

function validateStep3() {
  const fileInput = document.getElementById('slip-file');
  if (!fileInput.files[0]) {
    alert('ກະລນາອັບໂຫລດຮູບສະລິບໂອນເງິນກ່ອນ');
    return;
  }

  // ສະແດງຂມູນສະຫຼຸບໃນຂັ້ນ 4
  document.getElementById('final-name').textContent = currentProduct.name;
  document.getElementById('final-qty').textContent = currentQty;
  document.getElementById('final-total').textContent = (currentProduct.price * currentQty) + ' ກີບ';
  document.getElementById('final-phone').textContent = document.getElementById('customer-phone').value;
  document.getElementById('final-address').textContent = document.getElementById('customer-address').value;

  goToStep(4);
}

async function submitOrder() {
  const confirmBtn = document.getElementById('confirm-btn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'ກລັງສົ່ງ...';

  const formData = new FormData();
  formData.append('product_id', currentProduct.id);
  formData.append('quantity', currentQty);
  formData.append('customer_phone', document.getElementById('customer-phone').value);
  formData.append('customer_address', document.getElementById('customer-address').value);
  formData.append('slip', document.getElementById('slip-file').files[0]);

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      sessionStorage.removeItem('checkoutProduct');
      window.location.href = 'thankyou.html';
    } else {
      alert('ເກີດຂໍ້ຜິດພາດ: ' + data.error);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'ຢືນຢັນການສັ່ງຊື້';
    }
  } catch (err) {
    alert('ເຊື່ອມຕໍ່ບໍ່ໄດ້ ກະລຸນາລອງໃໝ່');
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'ຢືນຢັນການສັງຊື້';
  }
}