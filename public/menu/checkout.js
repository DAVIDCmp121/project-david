let currentProduct = null;
let currentQty = 1;
let currentPhone = '';

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
  const total = currentProduct.price * currentQty;
  document.getElementById('sum-total').textContent = total + ' ກີບ';

  const payAmountEl = document.getElementById('pay-amount');
  if (payAmountEl) payAmountEl.textContent = total + ' ກີບ';
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

// ✅ ຂັ້ນ 2ກ: ເຊັກເບີໂທວ່າເກົ່າ/ໃໝ່
async function checkPhone() {
  const phone = document.getElementById('customer-phone').value.trim();
  const errBox = document.getElementById('phone-check-error');
  errBox.textContent = '';

  if (!phone) {
    errBox.textContent = 'ກະລຸນາໃສ່ເບີໂທ';
    return;
  }
  currentPhone = phone;

  try {
    const res = await fetch('/api/customer-auth/check-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();

    document.getElementById('phone-check-section').classList.add('hidden');
    if (data.exists) {
      document.getElementById('login-section').classList.remove('hidden');
    } else {
      document.getElementById('register-section').classList.remove('hidden');
    }
  } catch (err) {
    errBox.textContent = 'ເຊື່ອມຕໍ່ບໍ່ໄດ້ ກະລຸນາລອງໃໝ່';
  }
}

// ✅ ຂັ້ນ 2ຂ: ລູກຄ້າເກົ່າ login ດ້ວຍ PIN ເດີມ
async function submitLoginStep() {
  const pin = document.getElementById('login-pin').value.trim();
  const errBox = document.getElementById('login-error');
  errBox.textContent = '';

  if (!pin) {
    errBox.textContent = 'ກະລຸນາໃສ່ PIN';
    return;
  }

  try {
    const res = await fetch('/api/customer-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone: currentPhone, pin })
    });
    const data = await res.json();
    if (data.success) {
      onAuthSuccess();
    } else {
      errBox.textContent = data.error || 'PIN ບໍ່ຖືກຕ້ອງ';
    }
  } catch (err) {
    errBox.textContent = 'ເກີດຂໍ້ຜິດພາດ, ລອງໃໝ່ພາຍຫຼັງ';
  }
}

// ✅ ຂັ້ນ 2ຄ: ລູກຄ້າໃໝ່ ຕັ້ງ PIN + ວັນເກີດ ແລ້ວສະໝັກ
async function submitRegisterStep() {
  const name = document.getElementById('reg-name').value.trim();
  const pin = document.getElementById('reg-pin').value.trim();
  const pinConfirm = document.getElementById('reg-pin-confirm').value.trim();
  const birth_date = document.getElementById('reg-birthdate').value.trim();
  const errBox = document.getElementById('register-error');
  errBox.textContent = '';

  if (!pin || !pinConfirm || !birth_date) {
    errBox.textContent = 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ';
    return;
  }
  if (pin !== pinConfirm) {
    errBox.textContent = 'PIN ແລະ ຢືນຢັນ PIN ບໍ່ຕົງກັນ';
    return;
  }

  try {
    const res = await fetch('/api/customer-auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone: currentPhone, pin, name, birth_date })
    });
    const data = await res.json();
    if (data.success) {
      onAuthSuccess();
    } else {
      errBox.textContent = data.error || 'ສະໝັກສະມາຊິກບໍ່ສຳເລັດ';
    }
  } catch (err) {
    errBox.textContent = 'ເກີດຂໍ້ຜິດພາດ, ລອງໃໝ່ພາຍຫຼັງ';
  }
}

// ✅ ພໍ login/ສະໝັກສຳເລັດ (ໄດ້ cookie ແລ້ວ) → ໂຊວ໌ຊ່ອງທີ່ຢູ່
function onAuthSuccess() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('register-section').classList.add('hidden');
  document.getElementById('logged-in-phone').textContent = currentPhone;
  document.getElementById('address-section').classList.remove('hidden');
}

function validateStep2() {
  const address = document.getElementById('customer-address').value.trim();
  if (!address) {
    alert('ກະລຸນາໃສ່ທີ່ຢູ່ຈັດສົ່ງ');
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

async function validateStep3() {
  const fileInput = document.getElementById('slip-file');
  if (!fileInput.files[0]) {
    alert('ກະລນາອັບໂຫລດຮູບສະລິບໂອນເງິນກ່ອນ');
    return;
  }

  const nextBtn = document.getElementById('step3-next-btn');
  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.textContent = 'ກຳລັງກວດສອບ...';
  }

  try {
    const formData = new FormData();
    formData.append('slip', fileInput.files[0]);
    formData.append('product_id', currentProduct.id);
    formData.append('quantity', currentQty);

    const res = await fetch('/api/orders/verify-slip', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (!data.valid) {
      alert(data.reason || 'ຮູບທີ່ອັບໂຫລດບໍ່ຖືກຕ້ອງ ກະລຸນາກວດສອບແລ້ວລອງໃໝ່');
      return;
    }

    document.getElementById('final-name').textContent = currentProduct.name;
    document.getElementById('final-qty').textContent = currentQty;
    document.getElementById('final-total').textContent = (currentProduct.price * currentQty) + ' ກີບ';
    document.getElementById('final-phone').textContent = currentPhone;
    document.getElementById('final-address').textContent = document.getElementById('customer-address').value;

    goToStep(4);
  } catch (err) {
    alert('ກວດສອບຮູບບໍ່ໄດ້ ກະລຸນາລອງໃໝ່');
  } finally {
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = 'ຕໍ່ໄປ';
    }
  }
}

async function submitOrder() {
  const confirmBtn = document.getElementById('confirm-btn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'ກລັງສົ່ງ...';

  const address = document.getElementById('customer-address').value;
  const total = currentProduct.price * currentQty;
  const slipFile = document.getElementById('slip-file').files[0];

  const formData = new FormData();
  formData.append('product_id', currentProduct.id);
  formData.append('quantity', currentQty);
  formData.append('customer_phone', currentPhone);
  formData.append('customer_address', address);
  formData.append('slip', slipFile);

  try {
    // ✅ ເພີ່ມ credentials: 'include' ເພື່ອສົ່ງ cookie ລູກຄ້າ (ຈຳເປັນເພາະ orders.js ບັງຄັບ login ແລ້ວ)
    const res = await fetch('/api/orders', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      sessionStorage.removeItem('checkoutProduct');

      const orderMessage =
        `ສັ່ງຊື້ໃໝ່:\n` +
        `ສິນຄ້າ: ${currentProduct.name}\n` +
        `ຈຳນວນ: ${currentQty}\n` +
        `ລວມ: ${total} ກີບ\n` +
        `ທີ່ຢູ່ຈັດສົ່ງ: ${address}`;

      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message_text: orderMessage })
        });

        const slipFormData = new FormData();
        slipFormData.append('image', slipFile);
        await fetch('/api/messages/upload', {
          method: 'POST',
          credentials: 'include',
          body: slipFormData
        });
      } catch (msgErr) {
        console.error('ສົ່ງຂໍ້ຄວາມ/ຮູບເຂົ້າແຊັດບໍ່ສຳເລັດ:', msgErr);
      }

      window.location.href = 'chat.html';
    } else {
      alert('ເກີດຂໍ້ຜິດພາດ: ' + data.error);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'ຢນຢັນການສັ່ງຊື້';
    }
  } catch (err) {
    alert('ເຊື່ອມຕໍ່ບໍ່ໄດ້ ກະລຸນາລອງໃໝ່');
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'ຢືນຢັນການສັງຊື້';
  }
}