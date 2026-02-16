/* ======================================================
   1. CONFIGURATION & CLIENT INIT
   ====================================================== */
if (typeof window._HYGIE_URL === 'undefined') {
    window._HYGIE_URL = 'https://tfnvgsjfegrpsyuzthpn.supabase.co';
    window._HYGIE_KEY = 'sb_publishable_W6IMM3hM_0UK69ZMgaRrfA_PWJfL9j8';
    window._client = window.supabase.createClient(window._HYGIE_URL, window._HYGIE_KEY);
}

const db = {
    currentUser: null,
    currentRole: null,

    init: async function() {
        console.log("HygieGo System Initializing...");
        const storedUser = localStorage.getItem('hygieUser');
        const storedRole = localStorage.getItem('hygieRole');

        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            this.currentRole = storedRole;
            this.updateNav();
        }

        // --- Logic ป้องกันการเข้า Dashboard ---
        if (window.location.pathname.includes("dashboard.html")) {
            if (!this.currentUser) {
                // 1. ไม่ได้ล็อกอิน -> เด้งไปหน้าแรกทันที
                window.location.href = 'index.html';
            } else if (this.currentRole === 'user' && this.currentUser.payment_status !== 'paid') {
                // 2. ล็อกอินแล้วแต่ยังไม่จ่ายเงิน -> แจ้งเตือนสวยๆ ก่อนเด้งไปหน้า Pricing
                Swal.fire({
                    icon: 'warning',
                    title: 'ยังไม่พบการชำระเงิน',
                    text: 'กรุณาเลือกซื้อแพ็คเกจเพื่อเปิดใช้งานระบบจัดการครับ',
                    confirmButtonColor: '#00C3AA',
                    confirmButtonText: 'ดูแพ็คเกจราคา',
                    allowOutsideClick: false
                }).then(() => {
                    window.location.href = 'pricing.html';
                });
            } else {
                // 3. ผ่านทุกเงื่อนไข -> โหลด Dashboard ตามปกติ
                await this.renderDashboard();
            }
        }
    },

    /* ======================================================
       2. AUTHENTICATION (LOGIN & REGISTER)
       ====================================================== */
    login: async function(email, password) {
        console.log("Attempting login for:", email);
        try {
            // 1. เช็ค Users
            let { data: user } = await window._client.from('Users').select('*').eq('email', email).single();
            if (user) {
                if (user.password_hash === password) {
                    this.saveSession(user, 'user');
                    return;
                }
            }

            // 2. เช็ค Admin
            let { data: admin } = await window._client.from('Admin').select('*').eq('email', email).single();
            if (admin) {
                if (admin.password_hash === password) {
                    this.saveSession(admin, 'admin');
                    return;
                }
            }

            Swal.fire({
                icon: 'error',
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                text: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง ❌',
                confirmButtonColor: '#00C3AA'
            });

        } catch (err) {
            console.error("Login Error:", err);
            // แทนที่ alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
            Swal.fire({
                icon: 'warning',
                title: 'การเชื่อมต่อผิดพลาด',
                text: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาลองใหม่ครับ',
                confirmButtonColor: '#00C3AA'
            });
        }
    },

    register: async function(userData) {
        try {
            const btn = document.getElementById("auth-btn-submit");
            if (btn) {
                btn.innerText = "กำลังบันทึก...";
                btn.disabled = true;
            }

            // Insert ลง Supabase
            const { data, error } = await window._client
                .from('Users')
                .insert([userData])
                .select();

            if (error) {
                console.error("Register Error:", error);
                if (error.message.includes("duplicate")) {
                    // แทนที่ alert("❌ อีเมลนี้ถูกใช้งานแล้ว");
                    Swal.fire({
                        icon: 'info',
                        title: 'อีเมลนี้มีเจ้าของแล้ว',
                        text: 'ดูเหมือนคุณจะมีบัญชีอยู่แล้ว ลองเข้าสู่ระบบดูไหมครับ?',
                        confirmButtonColor: '#00C3AA'
                    });
                } else {
                    // แทนที่ alert("เกิดข้อผิดพลาด: " + error.message);
                    Swal.fire({
                        icon: 'error',
                        title: 'สมัครสมาชิกไม่สำเร็จ',
                        text: 'ข้อผิดพลาด: ' + error.message,
                        confirmButtonColor: '#00C3AA'
                    });
                }
                return;
            }

            // แทนที่ alert("✅ สมัครสมาชิกสำเร็จ! ยินดีต้อนรับสู่ครอบครัว HygieGo");
            await Swal.fire({
                icon: 'success',
                title: 'สมัครสมาชิกสำเร็จ!',
                text: 'ยินดีต้อนรับสู่ครอบครัว HygieGo ✅',
                timer: 2000,
                showConfirmButton: false
            });

            // Auto Login หลังสมัครเสร็จ
            await this.login(userData.email, userData.password_hash);

        } catch (err) {
            console.error("System Error:", err);
            // แทนที่ alert("เกิดข้อผิดพลาดที่ไม่คาดคิด");
            Swal.fire({
                icon: 'warning',
                title: 'ระบบขัดข้อง',
                text: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
                confirmButtonColor: '#00C3AA'
            });
        } finally {
            const btn = document.getElementById("auth-btn-submit");
            if (btn) {
                btn.innerText = "ลงทะเบียน";
                btn.disabled = false;
            }
        }
    },

    saveSession: function(data, role) {
        this.currentUser = data;
        this.currentRole = role;
        localStorage.setItem('hygieUser', JSON.stringify(data));
        localStorage.setItem('hygieRole', role);

        // 1. เช็คว่ามีลิงก์จ่ายเงินค้างไว้ไหม (กรณีเลือกแพ็คเกจมาก่อน Login)
        const pendingUrl = localStorage.getItem('pendingPaymentUrl');
        if (pendingUrl && role === 'user') {
            localStorage.removeItem('pendingPaymentUrl');
            window.location.href = pendingUrl;
            return;
        }

        // 2. เช็คว่าเป็น Admin หรือไม่ (Admin เข้าได้เลย)
        if (role === 'admin') {
            window.location.href = "dashboard.html";
            return;
        }

        // 3. เช็คสถานะการจ่ายเงิน (สำหรับ User ทั่วไป)
        if (data.payment_status === 'paid') {
            window.location.href = "dashboard.html";
        } else {
            // ถ้ายังไม่จ่าย พาไปเลือกแพ็คเกจ
            window.location.href = "pricing.html";
        }
    },

    logout: function() {
        localStorage.clear();
        window.location.href = "index.html";
    },

    updateNav: function() {
        const navAuth = document.getElementById("nav-auth-section");
        if (!navAuth) return;

        if (this.currentUser) {
            const name = this.currentRole === 'user' ? this.currentUser.restaurant_name : this.currentUser.first_name;
            navAuth.innerHTML = `
                <div class="user-nav-group">
                    <a href="dashboard.html" class="btn-nav-dash" title="ไปที่หน้าจัดการ">
                        <i class="fas fa-chart-line"></i> <span>Dashboard</span>
                    </a>
                    <div class="user-profile-display">
                        <span class="user-text">${name}</span>
                    </div>
                    <button onclick="db.logout()" class="btn-nav-logout" title="ออกจากระบบ">
                        <i class="fas fa-power-off"></i>
                    </button>
                </div>
            `;
        } else {
            navAuth.innerHTML = `<button class="btn-login" onclick="openModal('auth-modal')">เข้าสู่ระบบ</button>`;
        }
    },

    renderDashboard: async function() {
        const user = this.currentUser;
        const uName = document.getElementById("u-name");
        if (uName) uName.textContent = this.currentRole === 'user' ? user.restaurant_name : user.first_name;

        const rBadge = document.getElementById("role-badge");
        if (rBadge) rBadge.textContent = this.currentRole.toUpperCase();

        if (this.currentRole === 'admin') {
            const adminMenu = document.getElementById("menu-admin");
            if (adminMenu) adminMenu.classList.remove('hidden');
            window.showView('view-admin');
            await this.renderAdminTable();
        } else {
            const customerMenu = document.getElementById("menu-customer");
            if (customerMenu) customerMenu.classList.remove('hidden');
            window.showView('view-customer');
            await this.renderCustomerStats();
        }
    },

    // --- ส่วนของ Admin ---
    renderAdminTable: async function() {
        // 1. ระบุตำแหน่งตาราง
        const tbody = document.getElementById("admin-task-table");
        if (!tbody) return;

        // 2. [เพิ่ม] ล้างข้อมูลเก่าในตารางทิ้งก่อน เพื่อให้ User เห็นว่าระบบกำลังอัปเดต
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">🔄 กำลังโหลดข้อมูลล่าสุด...</td></tr>';

        // 3. ดึงข้อมูล (เพิ่ม .select('*') และดึงข้อมูลใหม่จาก Supabase)
        const { data: list, error } = await window._client
            .from('Inspection')
            .select(`*, Booking ( Packagetransaction ( Users ( restaurant_name ) ) )`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Admin Fetch Error:", error);
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
            return;
        }

        if (list) {
            // --- 📊 ส่วนที่ 1: อัปเดตตัวเลขสถิติ (Stats) ---
            // คำนวณใหม่จากข้อมูลที่ดึงมาล่าสุด (list) ทันที
            const total = list.length;
            const done = list.filter(i => i.status === 'completed').length;
            const doing = list.filter(i => i.status !== 'completed').length;

            // อัปเดตตัวเลขบนหน้าจอ
            if (document.getElementById("stat-total")) document.getElementById("stat-total").textContent = total;
            if (document.getElementById("stat-done")) document.getElementById("stat-done").textContent = done;
            if (document.getElementById("stat-doing")) document.getElementById("stat-doing").textContent = doing;

            // --- 📋 ส่วนที่ 2: วาดรายการในตารางใหม่ ---
            tbody.innerHTML = list.map(i => {
                // เช็คชื่อร้านค้า
                let restaurantName = 'ไม่ระบุร้านค้า';

                if (i.restaurant_name) {
                    // กรณี: เพิ่มงานเอง (มีชื่อร้านในตัว)
                    restaurantName = i.restaurant_name;
                } else if (i.Booking && i.Booking.Packagetransaction && i.Booking.Packagetransaction.Users) {
                    // กรณี: งานจาก Booking (เช็คทีละขั้นว่ามีข้อมูลไหม)
                    restaurantName = i.Booking.Packagetransaction.Users.restaurant_name || 'ไม่ระบุร้านค้า';
                }

                let hasImage = i.image_url ? '<i class="fas fa-image" style="color:#00C3AA;" title="มีรูปภาพแนบ"></i>' : '';
                const statusClass = i.status === 'completed' ? 'status-done' : 'status-doing';

                return `
                <tr>
                    <td>
                        <strong>${restaurantName}</strong> ${hasImage}
                        <br>
                        <small style="color:#888;">ID: ${i.inspection_id}</small>
                    </td>
                    <td>
                        <span class="badge ${statusClass}">${i.status}</span>
                    </td>
                    <td>${i.inspection_date || '-'}</td>
                    <td style="text-align:right;">
                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                            <button class="action-btn" onclick="window.openTaskModal('${i.inspection_id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" onclick="window.deleteTaskDirect('${i.inspection_id}')" 
                                    style="background-color: #fee2e2; color: #dc2626; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            }).join('');
        }
    },

    // --- ส่วนของ User (Customer) ---
    renderCustomerStats: async function() {
        document.getElementById("user-name-display").textContent = this.currentUser.restaurant_name;

        // --- ส่วนดึงข้อมูลแพ็คเกจ ---
        try {
            const { data: tx } = await window._client.from('Packagetransaction')
                .select('*, Packages(package_name)')
                .eq('user_id', this.currentUser.user_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // แก้ไข: ใช้ if เช็คแทน ?.
            if (tx && tx.Packages) {
                const activePkg = document.getElementById("active-package");
                if (activePkg) {
                    activePkg.textContent = tx.Packages.package_name || "Smart Plan";
                }
            }
        } catch (e) {
            console.log("Package check skipped or not found");
        }

        // --- ส่วนดึงรายการงาน (Tasks) ---
        const { data: myTasks } = await window._client.from('Inspection')
            .select(`*, Booking!inner ( Packagetransaction!inner ( user_id ) )`)
            .eq('Booking.Packagetransaction.user_id', this.currentUser.user_id)
            .order('created_at', { ascending: false });

        const docList = document.getElementById("document-list");
        const placeholder = document.getElementById("no-doc-placeholder");

        // แก้ไข: เช็ค myTasks และซ่อน placeholder
        if (docList && myTasks && myTasks.length > 0) {
            if (placeholder) {
                placeholder.classList.add("hidden");
            }

            docList.innerHTML = `<h3 style="margin-bottom:15px;">รายการตรวจของคุณ</h3>` + myTasks.map(task => {
                // เตรียมข้อมูลก่อน Return string
                const inspectionDate = task.inspection_date || 'รอเจ้าหน้าที่ระบุ';
                const hasImgStatus = task.image_url ? '<div style="font-size:12px; color:#00C3AA;"><i class="fas fa-check-circle"></i> ส่งรูปแล้ว</div>' : '';
                const viewBtn = task.image_url ? `<button onclick="window.openFullImage('${task.image_url}')" style="margin-right:5px; cursor:pointer; background:none; border:none; color:#00C3AA;">ดูรูป</button>` : '';
                const btnBg = task.image_url ? '#f0f0f0' : '#00C3AA';
                const btnColor = task.image_url ? '#333' : 'white';
                const btnText = task.image_url ? 'เปลี่ยนรูป' : 'แนบรูป';

                return `
            <div style="background:white; padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold;">วันที่นัดหมาย: ${inspectionDate}</div>
                    <div style="font-size:12px; color:#666;">สถานะ: ${task.status}</div>
                    ${hasImgStatus}
                </div>
                <div>
                    ${viewBtn}
                    <button onclick="window.triggerUpload('${task.inspection_id}')" style="background:${btnBg}; color:${btnColor}; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">
                        <i class="fas fa-camera"></i> ${btnText}
                    </button>
                </div>
            </div>
        `;
            }).join('');
        }
    }
};

/* ======================================================
   3. HELPER FUNCTIONS (Upload, Payment, Modal)
   ====================================================== */
let currentUploadTaskId = null;
window.triggerUpload = (taskId) => {
    currentUploadTaskId = taskId;
    let uploader = document.getElementById('hidden-uploader');
    if (!uploader) {
        uploader = document.createElement('input');
        uploader.type = 'file';
        uploader.id = 'hidden-uploader';
        uploader.style.display = 'none';
        uploader.accept = 'image/*';
        uploader.onchange = window.handleImageUpload;
        document.body.appendChild(uploader);
    }
    uploader.click();
};

window.handleImageUpload = async(event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ตรวจสอบชนิดไฟล์ด้วย Swal
    if (!file.type.startsWith('image/')) {
        Swal.fire({
            icon: 'error',
            title: 'ไฟล์ไม่ถูกต้อง',
            text: 'กรุณาเลือกไฟล์รูปภาพเท่านั้นครับ',
            confirmButtonColor: '#00C3AA'
        });
        event.target.value = '';
        return;
    }

    try {
        // เปลี่ยนจาก confirm เป็น Swal.fire
        const result = await Swal.fire({
            title: 'ยืนยันการส่งรูปภาพ?',
            text: "คุณต้องการอัปโหลดรูปภาพนี้เข้าสู่ระบบใช่หรือไม่",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#00C3AA',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'ใช่, อัปโหลดเลย',
            cancelButtonText: 'ยกเลิก'
        });

        if (!result.isConfirmed) {
            event.target.value = '';
            return;
        }

        // แสดง Loading ระหว่างอัปโหลด (ทางเลือก: เพื่อให้ User รู้ว่าระบบกำลังทำงาน)
        Swal.fire({
            title: 'กำลังอัปโหลด...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const fileName = `${Date.now()}_${file.name.replace(/\s/g, '')}`;

        // อัปโหลดไปที่ Supabase Storage
        const { error: uploadError } = await window._client.storage.from('task-images').upload(fileName, file);
        if (uploadError) throw uploadError;

        // ดึง URL ของรูป
        const { data: { publicUrl } } = window._client.storage.from('task-images').getPublicUrl(fileName);

        // อัปเดตลงฐานข้อมูล (ตรวจสอบว่ามี currentUploadTaskId ประกาศไว้ใน scope ที่เข้าถึงได้)
        const { error: dbError } = await window._client.from('Inspection')
            .update({ image_url: publicUrl })
            .eq('inspection_id', window.currentUploadTaskId); // ใช้ window. เพื่อความชัวร์ถ้าประกาศแบบ Global

        if (dbError) throw dbError;

        // แจ้งสำเร็จ
        await Swal.fire({
            icon: 'success',
            title: 'อัปโหลดเรียบร้อย! ✅',
            timer: 1500,
            showConfirmButton: false
        });

        // รีเฟรชหน้าจอ
        if (typeof db.renderDashboard === 'function') {
            db.renderDashboard();
        }

    } catch (err) {
        console.error("Upload Failed:", err);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: err.message,
            confirmButtonColor: '#00C3AA'
        });
    } finally {
        event.target.value = '';
    }
};

window.openFullImage = (src) => {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('full-image-preview');
    if (modal && img) {
        img.src = src;
        modal.classList.remove('hidden');
    } else { window.open(src, '_blank'); }
};

window.saveTask = async function() {
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : "";
    };

    const id = getValue("task-id");
    const customerName = getValue("task-customer-name");
    const title = getValue("task-title");
    const description = getValue("task-description");
    const status = getValue("task-status") || "pending";
    const priority = getValue("task-priority") || "Medium";
    const date = getValue("task-due");

    try {
        Swal.fire({
            title: 'กำลังบันทึก...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const taskData = {
            restaurant_name: customerName || "ทั่วไป",
            title: title || "งานตรวจใหม่",
            status: status || "pending",
            priority: priority || "Medium",
            inspection_date: date || new Date().toISOString().split('T')[0],
            result: "-",
            description: description || ""
        };

        if (id && id.trim() !== "") {
            const { error } = await window._client.from('Inspection').update(taskData).eq('inspection_id', id);
            if (error) throw error;
        } else {
            taskData.inspection_id = "INS-" + Date.now();
            const { error } = await window._client.from('Inspection').insert([taskData]);
            if (error) throw error;
        }

        // --- ส่วนการจัดการหน้าจอหลังจากบันทึกสำเร็จ ---

        // 1. ปิด Modal และล้างค่า Form
        window.closeModal('task-modal');
        document.getElementById("task-id").value = "";
        const form = document.querySelector('#task-modal form');
        if (form) form.reset();

        // 2. แจ้งเตือนสำเร็จ
        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });

        // 3. 🛡️ จุดไม้ตาย: ล้างตารางทิ้งก่อนเพื่อให้ User เห็นว่ากำลังโหลดใหม่
        const tbody = document.getElementById("admin-task-table");
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">🔄 กำลังอัปเดตข้อมูล...</td></tr>';

        // 4. หน่วงเวลา 500ms แล้วสั่ง Render ใหม่ (เพื่อให้ DB ทันอัปเดต)
        setTimeout(async() => {
            console.log("Re-rendering table...");
            if (window.db && typeof window.db.renderAdminTable === 'function') {
                await window.db.renderAdminTable();
            } else if (typeof renderAdminTable === 'function') {
                await renderAdminTable();
            } else {
                // ถ้าหาฟังก์ชันไม่เจอจริงๆ วิธีนี้ได้ผล 100%
                window.location.reload();
            }
        }, 500);

    } catch (e) {
        console.error("Save Task Error:", e);
        Swal.fire({
            icon: 'error',
            title: 'บันทึกไม่สำเร็จ',
            text: `Error: ${e.message}`
        });
    }
};

window.openTaskModal = async(id = null) => {
    window.openModal('task-modal');

    // 1. เคลียร์ค่าในฟอร์มให้ว่างก่อน (กรณีเพิ่มงานใหม่)
    document.getElementById("task-id").value = id || "";
    document.getElementById("task-customer-name").value = "";
    document.getElementById("task-title").value = "";
    document.getElementById("task-description").value = "";
    document.getElementById("task-status").value = "pending";
    document.getElementById("task-priority").value = "Medium";
    document.getElementById("task-due").value = "";

    const imgEl = document.getElementById("admin-task-img");
    const placeholder = document.getElementById("img-placeholder");

    if (imgEl) imgEl.classList.add("hidden");
    if (placeholder) {
        placeholder.classList.remove("hidden");
        placeholder.innerText = id ? "กำลังโหลดข้อมูล..." : "ไม่มีรูปภาพประกอบ";
    }

    // 2. ถ้ามี ID (กรณีแก้ไขงานเดิม) ให้ไปดึงข้อมูลมาโชว์
    if (id) {
        // ตรวจสอบชื่อตาราง (ของคุณใช้ 'Inspection') และชื่อ Column ให้ตรงกับในฐานข้อมูลนะครับ
        let { data: task } = await window._client
            .from('Inspection')
            .select('*')
            .eq('inspection_id', id)
            .single();

        if (task) {
            // หยอดข้อมูลลงใน Input ต่างๆ ตามรูปที่ต้องการ
            if (document.getElementById("task-customer-name"))
                document.getElementById("task-customer-name").value = task.restaurant_name || "";

            if (document.getElementById("task-title"))
                document.getElementById("task-title").value = task.title || "";

            if (document.getElementById("task-description"))
                document.getElementById("task-description").value = task.description || "";

            document.getElementById("task-status").value = task.status || "pending";
            document.getElementById("task-priority").value = task.priority || "Medium";
            document.getElementById("task-due").value = task.inspection_date || "";

            // จัดการรูปภาพ
            if (task.image_url) {
                if (imgEl) {
                    imgEl.src = task.image_url;
                    imgEl.classList.remove("hidden");
                }
                if (placeholder) placeholder.classList.add("hidden");
            } else {
                if (placeholder) placeholder.innerText = "ร้านค้านี้ยังไม่ได้แนบรูปภาพ";
            }
        }
    }
};

window.deleteTask = async function() {
    const id = document.getElementById("task-id").value;
    if (!id) return; // ถ้าเป็นงานใหม่ที่ยังไม่มี ID ก็ไม่ต้องลบ

    // ใช้ SweetAlert2 ถามเพื่อความแน่ใจ
    const confirm = await Swal.fire({
        title: 'ยืนยันการลบงาน?',
        text: "หากลบแล้วข้อมูลนี้จะหายไปถาวร!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'ใช่, ลบเลย',
        cancelButtonText: 'ยกเลิก'
    });

    if (confirm.isConfirmed) {
        try {
            Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });

            const { error } = await window._client
                .from('Inspection')
                .delete()
                .eq('inspection_id', id);

            if (error) throw error;

            await Swal.fire({ icon: 'success', title: 'ลบสำเร็จ!', timer: 1500, showConfirmButton: false });

            window.closeModal('task-modal');
            // รีเฟรชตารางเพื่อให้งานที่ลบหายไปจากหน้าจอ
            if (window.db && typeof window.db.renderAdminTable === 'function') {
                await window.db.renderAdminTable();
            }
        } catch (e) {
            Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
        }
    }
};

window.deleteTaskDirect = async function(id) {
    if (!id) return;

    const confirm = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "คุณต้องการลบรายการนี้ใช่หรือไม่?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก'
    });

    if (confirm.isConfirmed) {
        try {
            // 1. แสดง Loading รอไว้ก่อน
            Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });

            const { error } = await window._client
                .from('Inspection')
                .delete()
                .eq('inspection_id', id);

            if (error) throw error;

            // 2. แจ้งลบสำเร็จ
            await Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 800, showConfirmButton: false });

            // 3. บังคับรีโหลดตาราง (ใส่ setTimeout เพื่อให้ DB มั่นใจว่าลบเสร็จแน่ๆ)
            setTimeout(async() => {
                // 1. ลองสั่งล้างตารางก่อน (ถ้าตารางหายไปแสดงว่าฟังก์ชันทำงาน)
                const tbody = document.getElementById("admin-task-table");
                if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">กำลังโหลด...</td></tr>';

                // 2. เรียกฟังก์ชันวาดตารางใหม่
                if (window.db && window.db.renderAdminTable) {
                    await window.db.renderAdminTable();
                } else {
                    // ถ้าหา window.db ไม่เจอ ให้รีโหลดหน้าเว็บเป็นทางเลือกสุดท้าย
                    window.location.reload();
                }
            }, 300);

        } catch (e) {
            Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
        }
    }
};

window.submitInspectionRequest = async function(event) {
    // 1. ป้องกัน Error และรีเฟรชหน้า
    if (event && event.preventDefault) {
        event.preventDefault();
    }

    // 2. ดึง User (เขียนแบบเต็ม เพื่อป้องกัน Error ?. )
    var currentUser = null;
    if (window.db && window.db.currentUser) {
        currentUser = window.db.currentUser;
    } else {
        currentUser = JSON.parse(localStorage.getItem('hygieUser'));
    }

    if (!currentUser) {
        Swal.fire({
            icon: 'error',
            title: 'เซสชั่นหมดอายุ',
            text: 'กรุณาเข้าสู่ระบบใหม่เพื่อดำเนินการครับ',
            confirmButtonColor: '#00C3AA'
        });
        return;
    }

    try {
        // 3. ถามยืนยัน
        const confirmResult = await Swal.fire({
            title: 'ยืนยันการส่งคำขอ?',
            text: "คุณต้องการแจ้งเตือนเจ้าหน้าที่ให้เข้าตรวจร้านใช่หรือไม่",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#00C3AA',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'ใช่, ส่งคำขอเลย',
            cancelButtonText: 'ยกเลิก'
        });

        if (!confirmResult.isConfirmed) return;

        // 4. จัดการปุ่ม (เช็คแบบเต็ม ไม่ใช้ ?.)
        var btn = null;
        var originalText = "";

        if (event && event.target) {
            btn = event.target.closest('button');
            if (btn) {
                originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerText = "กำลังค้นหางาน...";
            }
        }

        // 5. ค้นหางานจากชื่อร้าน
        const myName = currentUser.restaurant_name || currentUser.first_name;

        const response = await window._client
            .from('Inspection')
            .select('inspection_id, status, restaurant_name')
            .eq('restaurant_name', myName)
            .neq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const latestTask = response.data;
        const error = response.error;

        // ถ้าไม่เจองาน
        if (!latestTask || error) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่พบรายการตรวจ',
                text: 'ไม่พบงานที่ค้างอยู่ในระบบ กรุณาติดต่อแอดมินเพื่อสร้างงานตรวจก่อนครับ',
                confirmButtonColor: '#FFB74D'
            });
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            return;
        }

        // 6. อัปเดตสถานะ
        if (btn) btn.innerText = "กำลังส่งข้อมูล...";

        await window._client
            .from('Inspection')
            .update({
                status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('inspection_id', latestTask.inspection_id);

        // 7. สำเร็จ
        await Swal.fire({
            icon: 'success',
            title: 'ส่งคำขอสำเร็จ!',
            text: 'ระบบได้รับคำขอแล้ว เจ้าหน้าที่จะติดต่อกลับเร็วๆ นี้ ✅',
            confirmButtonColor: '#00C3AA'
        });

        window.location.reload();

    } catch (err) {
        console.error("Submit Error:", err);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถบันทึกข้อมูลได้',
            confirmButtonColor: '#EF4444'
        });
    } finally {
        // คืนค่าปุ่ม
        const finalBtn = document.querySelector('button[onclick*="submitInspectionRequest"]');
        if (finalBtn) {
            finalBtn.disabled = false;
            finalBtn.innerHTML = '<i class="fas fa-save"></i> บันทึกและส่งคำขอตรวจ';
        }
    }
};

window.handlePackageSelection = function(planName, price) {
    const user = localStorage.getItem('hygieUser');

    if (user) {
        // ถ้าล็อกอินอยู่แล้ว -> ไปหน้าชำระเงินได้เลย
        window.location.href = `payment.html?plan=${encodeURIComponent(planName)}&price=${price}`;
    } else {
        // ถ้ายังไม่ได้ล็อกอิน -> เก็บ URL ไว้แล้วบอกให้เข้าสู่ระบบด้วย Swal
        localStorage.setItem('pendingPaymentUrl', `payment.html?plan=${encodeURIComponent(planName)}&price=${price}`);

        Swal.fire({
            title: 'ก้าวเดียวสู่การจัดการที่ดีขึ้น!',
            text: 'กรุณาเข้าสู่ระบบเพื่อดำเนินการสั่งซื้อแพ็คเกจ ' + planName,
            icon: 'info',
            confirmButtonColor: '#00C3AA',
            confirmButtonText: 'เข้าสู่ระบบ / ลงทะเบียน',
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                window.openModal('auth-modal');
            }
        });
    }
};

/* ======================================================
   4. MODAL & AUTH UI LOGIC (แก้ไขใหม่)
   ====================================================== */
let isRegisterMode = false;

window.toggleAuthMode = () => {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById("auth-title");
    const btn = document.getElementById("auth-btn-submit");
    const regFields = document.getElementById("register-fields");
    const toggleText = document.getElementById("auth-toggle-text");
    const toggleLink = document.getElementById("auth-toggle-link");

    // Safety Check: ถ้า HTML ยังเป็นตัวเก่า (ไม่มี register-fields) จะไม่ Error
    if (!regFields) {
        console.warn("Register fields missing in HTML");
        return;
    }

    if (isRegisterMode) {
        title.innerText = "สมัครสมาชิกใหม่";
        btn.innerText = "ลงทะเบียน";
        btn.style.background = "#2563eb";
        regFields.classList.remove("hidden");
        toggleText.innerText = "มีบัญชีอยู่แล้ว?";
        toggleLink.innerText = "เข้าสู่ระบบ";
    } else {
        title.innerText = "เข้าสู่ระบบ";
        btn.innerText = "เข้าสู่ระบบ";
        btn.style.background = "#00C3AA";
        regFields.classList.add("hidden");
        toggleText.innerText = "ยังไม่มีบัญชี?";
        toggleLink.innerText = "สมัครสมาชิก";
    }
};

window.handleAuthSubmit = async(e) => {
    e.preventDefault();

    // 1. ดึงปุ่มมาเตรียมทำ Loading
    const btn = document.getElementById("auth-btn-submit");
    const originalText = btn ? btn.innerHTML : (isRegisterMode ? "ลงทะเบียน" : "เข้าสู่ระบบ");

    // ดึงค่าพื้นฐาน
    const emailEl = document.getElementById("auth-email");
    const passEl = document.getElementById("auth-pass");

    if (!emailEl || !passEl) {
        const oldUser = document.getElementById("auth-user");
        if (oldUser && passEl) {
            db.login(oldUser.value, passEl.value);
            return;
        }

        Swal.fire({
            icon: 'error',
            title: 'ระบบขัดข้อง',
            text: 'ไม่พบช่องกรอกข้อมูลในหน้านี้',
            confirmButtonColor: '#00C3AA'
        });
        return;
    }

    const email = emailEl.value.trim();
    const pass = passEl.value.trim();

    if (!email || !pass) {
        Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบ',
            text: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วนครับ',
            confirmButtonColor: '#00C3AA'
        });
        return;
    }

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    };

    try {
        // --- เริ่มแสดงสถานะกำลังโหลดที่ปุ่ม ---
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังดำเนินการ...';
        }

        if (isRegisterMode) {
            // --- สมัครสมาชิก ---
            const confirmPass = getVal("auth-confirm-pass");

            if (pass !== confirmPass) {
                Swal.fire({
                    icon: 'error',
                    title: 'รหัสผ่านไม่ตรงกัน',
                    text: 'กรุณาตรวจสอบการยืนยันรหัสผ่านอีกครั้ง ❌',
                    confirmButtonColor: '#00C3AA'
                });
                return;
            }

            const formData = {
                email: email,
                password_hash: pass,
                first_name: getVal("reg-fname"),
                last_name: getVal("reg-lname"),
                phone: getVal("reg-phone"),
                restaurant_name: getVal("reg-shop-name"),
                restaurant_address: getVal("reg-address"),
                subdistrict: getVal("reg-subdistrict"),
                district: getVal("reg-district"),
                province: getVal("reg-province"),
                postal_code: getVal("reg-zip"),
                role: 'user',
                status: 'active',
                created_at: new Date().toISOString()
            };

            if (!formData.first_name || !formData.restaurant_name || !formData.phone) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณากรอกชื่อจริง, เบอร์โทร และชื่อร้านให้ครบถ้วนนะครับ',
                    confirmButtonColor: '#00C3AA'
                });
                return;
            }

            await db.register(formData);

        } else {
            // --- ล็อกอิน ---
            await db.login(email, pass);
        }

    } catch (err) {
        console.error("Auth Error:", err);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ระบบไม่สามารถดำเนินการได้ในขณะนี้',
            confirmButtonColor: '#00C3AA'
        });
    } finally {
        // --- คืนค่าสถานะปุ่ม ---
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};

/* ======================================================
   8. USER PROFILE EDIT SYSTEM
   ====================================================== */

// เปิด Modal และดึงข้อมูลปัจจุบันมาใส่ในช่อง
window.openProfileModal = function() {
    if (!db.currentUser) {
        Swal.fire({
            icon: 'error',
            title: 'เซสชั่นหมดอายุ',
            text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อดูข้อมูลส่วนตัวครับ',
            confirmButtonColor: '#00C3AA',
            confirmButtonText: 'ไปที่หน้าล็อกอิน'
        }).then((result) => {
            if (result.isConfirmed) {
                window.openModal('auth-modal');
            }
        });
        return;
    }

    const user = db.currentUser;

    // ฟังก์ชันช่วยเติมข้อมูล (ตรวจสอบ ID ให้ตรงกับ HTML)
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    // เติมข้อมูลตาม key ที่ได้มาจากฐานข้อมูล
    setVal('edit-email', user.email);
    setVal('edit-fname', user.first_name);
    setVal('edit-lname', user.last_name);
    setVal('edit-phone', user.phone);
    setVal('edit-shop-name', user.restaurant_name);
    setVal('edit-address', user.restaurant_address);
    setVal('edit-subdistrict', user.subdistrict);
    setVal('edit-district', user.district);
    setVal('edit-province', user.province);
    setVal('edit-zip', user.postal_code);

    window.openModal('profile-modal');
};

// บันทึกข้อมูลลง Database
window.saveProfile = async function() {
    const btn = document.querySelector('#profile-modal .btn-full-green');
    const originalText = btn.innerText;
    btn.innerText = "กำลังบันทึก...";
    btn.disabled = true;

    try {
        // 1. เตรียมข้อมูลที่จะอัปเดต
        const updates = {
            first_name: document.getElementById('edit-fname').value,
            last_name: document.getElementById('edit-lname').value,
            phone: document.getElementById('edit-phone').value,
            restaurant_name: document.getElementById('edit-shop-name').value,
            restaurant_address: document.getElementById('edit-address').value,
            subdistrict: document.getElementById('edit-subdistrict').value,
            district: document.getElementById('edit-district').value,
            province: document.getElementById('edit-province').value,
            postal_code: document.getElementById('edit-zip').value,
            updated_at: new Date().toISOString()
        };

        // 2. ส่งไปอัปเดตที่ Supabase (ใช้ user_id เป็นตัวระบุ)
        const { data, error } = await window._client
            .from('Users')
            .update(updates)
            .eq('user_id', db.currentUser.user_id)
            .select()
            .single();

        if (error) throw error;

        // 3. อัปเดตข้อมูลใน LocalStorage และหน้าเว็บทันที
        const newUserData = {...db.currentUser, ...updates };

        // บันทึกลงเครื่องใหม่
        localStorage.setItem('hygieUser', JSON.stringify(newUserData));
        db.currentUser = newUserData; // อัปเดตตัวแปรใน memory

        // แทนที่ alert("✅ แก้ไขข้อมูลเรียบร้อยแล้ว!");
        Swal.fire({
            icon: 'success',
            title: 'อัปเดตข้อมูลสำเร็จ!',
            text: 'ข้อมูลโปรไฟล์ของคุณถูกบันทึกเรียบร้อยแล้ว ✅',
            timer: 2000,
            showConfirmButton: false
        });

        window.closeModal('profile-modal');

        // รีเฟรชหน้า Dashboard เพื่อแสดงชื่อใหม่
        await db.renderDashboard();
        // รีเฟรช Navbar
        db.updateNav();

    } catch (err) {
        console.error("Update Failed:", err);
        // แทนที่ alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
        Swal.fire({
            icon: 'error',
            title: 'บันทึกไม่สำเร็จ',
            text: 'เกิดข้อผิดพลาด: ' + err.message,
            confirmButtonColor: '#00C3AA'
        });
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

/* ======================================================
   9. DELETE ACCOUNT SYSTEM
   ====================================================== */
window.deleteAccount = async function() {
    if (!db.currentUser) return;

    const swalConfig = {
        target: document.getElementById('profile-modal') || document.body,
        // บังคับ z-index ของ SweetAlert ให้สูงกว่า 100000 (ตามที่เราแก้ CSS modal ไป)
        didOpen: () => {
            const container = Swal.getContainer();
            if (container) container.style.zIndex = '1000001';
        }
    };
    // 1. ยืนยันครั้งที่ 1: ใช้ SweetAlert2 แทน confirm เดิม
    const result1 = await Swal.fire({
        title: 'ยืนยันการลบบัญชี?',
        text: "❗ ข้อมูลร้านค้าและประวัติการตรวจทั้งหมดจะหายไปถาวร!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626', // สีแดง Danger
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ใช่, ต้องการลบ',
        cancelButtonText: 'ยกเลิก'
    });

    if (!result1.isConfirmed) return;

    // 2. ยืนยันครั้งที่ 2: เพื่อความปลอดภัย (Double Check)
    const result2 = await Swal.fire({
        title: 'คุณแน่ใจจริงๆ นะ?',
        text: "⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้!",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#b91c1c',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ยืนยันลบถาวร',
        cancelButtonText: 'เปลี่ยนใจแล้ว'
    });

    if (!result2.isConfirmed) return;

    try {
        Swal.fire({
            ...swalConfig,
            title: 'กำลังลบข้อมูล...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
                Swal.getContainer().style.zIndex = '1000001'; // บังคับ z-index อีกรอบ
            }
        });

        const userId = db.currentUser.user_id;
        const { error } = await window._client
            .from('Users')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;

        await Swal.fire({
            ...swalConfig,
            icon: 'success',
            title: 'ลบบัญชีเรียบร้อยแล้ว',
            text: 'หวังว่าจะได้พบกันใหม่ในโอกาสหน้านะครับ 👋',
            timer: 3000,
            showConfirmButton: false
        });

        db.logout();

    } catch (err) {
        console.error("Delete Error:", err);
        Swal.fire({
            ...swalConfig,
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถลบบัญชีได้ในขณะนี้: ' + err.message,
            confirmButtonColor: '#00C3AA'
        });
    }
};

// เพิ่มฟังก์ชันเปิด Modal ให้เรียกใช้ได้จาก Dashboard
window.openProfileModal = function() {
    const user = db.currentUser;
    if (!user) return;

    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('edit-fname').value = user.first_name || '';
    document.getElementById('edit-lname').value = user.last_name || '';
    document.getElementById('edit-shop-name').value = user.restaurant_name || '';

    window.openModal('profile-modal');
};

// Global Helpers (ประกาศไว้ตรงนี้ทีเดียว ไม่ทับซ้อน)
window.openModal = (id) => {
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove("hidden");
        if (id === 'auth-modal' && isRegisterMode) toggleAuthMode(); // Reset to login
    }
};
window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
};
window.showView = (id) => {
    // 1. ซ่อนทุก Section ก่อน
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(v => {
        v.classList.add('hidden');
    });

    // 2. แสดงเฉพาะ Section ที่เลือก (เช็คแบบปลอดภัย ไม่ใช้ ?.)
    const targetView = document.getElementById(id);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
};

// ฟังก์ชัน Real-time Card Sync
const syncCardData = () => {
    const inputNum = document.getElementById('cardNumber');
    const inputName = document.getElementById('payerName');
    const inputExp = document.getElementById('cardExp');
    const inputCvv = document.getElementById('cardCvv');

    // Sync เลขบัตร (พร้อมเว้นวรรคอัตโนมัติ)
    inputNum.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, ''); // เอาเฉพาะตัวเลข
        let formatted = val.replace(/(.{4})/g, '$1 ').trim();
        e.target.value = formatted;
        document.getElementById('view-number').textContent = formatted || "•••• •••• •••• ••••";
    });

    // Sync ชื่อ
    inputName.addEventListener('input', (e) => {
        document.getElementById('view-name').textContent = e.target.value.toUpperCase() || "CUSTOMER NAME";
    });

    // Sync วันหมดอายุ
    inputExp.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
        e.target.value = val;
        document.getElementById('view-expiry').textContent = val || "MM/YY";
    });

    // Sync CVV
    inputCvv.addEventListener('input', (e) => {
        document.getElementById('view-cvv').textContent = "CVV: " + (e.target.value || "***");
    });
};

// ฟังก์ชันโหลดข้อมูลติดตามงานและคิว
async function loadTrackingInfo() {
    // 1. ดึงข้อมูล User ปัจจุบัน
    const currentUser = JSON.parse(localStorage.getItem('hygieUser'));
    if (!currentUser) return;

    const myName = currentUser.restaurant_name || currentUser.first_name;
    document.getElementById('track-shop-name').innerText = myName;

    // 2. ดึงงานทั้งหมดที่ "ยังไม่เสร็จ" (status != completed) เรียงตามเวลา
    const { data: queueList, error } = await window._client
        .from('Inspection')
        .select('*')
        .neq('status', 'completed') // ไม่เอางานที่เสร็จแล้ว
        .order('inspection_date', { ascending: true }) // เรียงตามวันที่นัด
        .order('created_at', { ascending: true }); // ถ้าวันเท่ากัน เรียงตามใครมาก่อน

    if (error) {
        console.error("Load Queue Error:", error);
        return;
    }

    // 3. หาว่างานของเราอยู่อันดับที่เท่าไหร่ในรายการนี้
    // ใช้การเทียบชื่อร้าน (ต้องพิมพ์ให้ตรงกัน) หรือ User ID
    const myIndex = queueList.findIndex(item =>
        (item.restaurant_name && item.restaurant_name.trim() === myName.trim()) ||
        (item.user_id && item.user_id === currentUser.id)
    );

    // 4. แสดงผล
    if (myIndex !== -1) {
        // เจองานของเรา!
        const myTask = queueList[myIndex];
        const queueNo = myIndex + 1; // คิวที่ = index + 1

        // อัปเดตเลขคิว
        document.getElementById('track-queue-no').innerText = queueNo;
        document.getElementById('track-current-status').innerText = translateStatus(myTask.status);
        document.getElementById('track-desc').innerText = myTask.description || "กำลังดำเนินการตามขั้นตอน...";

        // อัปเดต Progress Bar
        updateProgressBar(myTask.status);
    } else {
        // ไม่เจองาน (อาจจะเสร็จไปแล้ว หรือยังไม่ได้จอง)
        document.getElementById('track-queue-no').innerText = "-";
        document.getElementById('track-current-status').innerText = "ไม่มีงานค้าง";
        document.getElementById('track-desc').innerText = "คุณไม่มีคิวงานที่กำลังดำเนินการ หรือการตรวจสอบเสร็จสิ้นแล้ว";
        resetProgressBar();
    }
}

// ฟังก์ชันขยับ Progress Bar
function updateProgressBar(status) {
    // ล้างค่าเก่าก่อน
    document.querySelectorAll('.step, .line').forEach(el => el.classList.remove('active'));

    const steps = ['pending', 'traveling', 'inspecting', 'completed'];
    let foundCurrent = false;

    steps.forEach((stepName, index) => {
        const stepEl = document.getElementById('step-' + stepName);
        if (!foundCurrent) {
            // ถ้าระบบยังไม่ถึงขั้นตอนนี้ ให้ระบายสีเขียว (ถือว่าผ่านหรือกำลังทำ)
            stepEl.classList.add('active');

            // ถ้าไม่ใช่ตัวสุดท้าย ให้ระบายสีเส้นต่อท้ายด้วย
            if (index < steps.length - 1) {
                // เช็คว่าสถานะปัจจุบันคือตัวนี้ไหม
                if (status === stepName) {
                    foundCurrent = true; // หยุดระบายสีตัวถัดไป
                } else {
                    // ถ้าย้งไม่ถึงสถานะปัจจุบัน ให้ระบายเส้นเชื่อมด้วย
                    const nextLine = stepEl.nextElementSibling;
                    if (nextLine && nextLine.classList.contains('line')) nextLine.classList.add('active');
                }
            }
        }
    });
}

// ฟังก์ชันแปลภาษา
function translateStatus(status) {
    const dict = {
        'pending': 'รอคิวตรวจสอบ',
        'traveling': 'กำลังเดินทาง',
        'inspecting': 'กำลังตรวจหน้างาน',
        'completed': 'เสร็จสิ้น'
    };
    return dict[status] || status;
}

// ฟังก์ชันโหลดงาน (วางทับฟังก์ชันเดิมของคุณได้เลย)
async function loadMyTasks() {
    // 1. ดึงข้อมูล User
    const currentUser = JSON.parse(localStorage.getItem('hygieUser'));
    if (!currentUser) return; // ถ้าไม่ได้ login ก็จบ

    // 2. ชื่อร้านที่ใช้ค้นหา
    const myName = currentUser.restaurant_name || currentUser.first_name;
    console.log("กำลังค้นหางานของ:", myName);

    // 3. ดึงข้อมูลจาก Supabase (แก้แล้ว: ตัด user_id ออก)
    const { data: list, error } = await window._client
        .from('Inspection')
        .select('*')
        .eq('restaurant_name', myName) // <--- จุดที่แก้: ใช้ชื่อร้านอย่างเดียว
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    console.log("✅ เจองานจำนวน:", list.length);

    // 4. แสดงผลลงตาราง (หา <tbody> ให้เจอ)
    // เช็ค ID ใน HTML ของคุณด้วยนะว่าชื่อ 'jobList' หรือเปล่า หรือใช้ document.querySelector('tbody')
    const tbody = document.getElementById('jobList') || document.querySelector('tbody');

    if (!tbody) return; // ถ้าหาตารางไม่เจอก็ออกจากฟังก์ชัน

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">ไม่พบข้อมูลงาน</td></tr>`;
        return;
    }

    // วาดตาราง
    tbody.innerHTML = list.map(i => {
        // จัดการสถานะให้สวยงาม
        let statusColor = 'gray';
        let statusText = i.status;

        if (i.status === 'pending') {
            statusColor = 'orange';
            statusText = 'รอคิว';
        } else if (i.status === 'completed') {
            statusColor = 'green';
            statusText = 'เสร็จสิ้น';
        } else if (i.status === 'inspecting') {
            statusColor = 'blue';
            statusText = 'กำลังตรวจ';
        }

        return `
            <tr>
                <td>${i.restaurant_name}</td>
                <td><span style="color:${statusColor}; font-weight:bold;">${statusText}</span></td>
                <td>${i.inspection_date || '-'}</td>
                <td>${i.location || '-'}</td>
            </tr>
        `;
    }).join('');
}

async function loadCustomerDashboard() {
    // เช็ค User
    var userStr = localStorage.getItem('hygieUser');
    if (!userStr) return;
    var currentUser = JSON.parse(userStr);

    // ชื่อร้านของฉัน
    var myName = currentUser.restaurant_name || currentUser.first_name;

    // แสดงชื่อบนหัวเว็บ
    if (document.getElementById('user-name-display'))
        document.getElementById('user-name-display').innerText = currentUser.first_name;
    if (document.getElementById('user-shop-display'))
        document.getElementById('user-shop-display').innerText = myName;

    // ดึงงานทั้งหมดที่ "ยังไม่เสร็จ"
    try {
        var response = await window._client
            .from('Inspection')
            .select('*')
            .neq('status', 'completed')
            .order('created_at', { ascending: true });

        var allQueue = response.data || [];

        // วนหาลำดับของร้านเรา
        var myQueueNo = "-";
        var myTask = null;

        for (var i = 0; i < allQueue.length; i++) {
            if (allQueue[i].restaurant_name.trim() === myName.trim()) {
                myTask = allQueue[i];
                myQueueNo = i + 1;
                break;
            }
        }

        // --- แสดงผล ---

        // 1. กล่องเลขคิว
        var queueBox = document.getElementById('user-queue');
        if (queueBox) {
            queueBox.innerText = (myQueueNo !== "-") ? "คิวที่ " + myQueueNo : "-";
            if (myQueueNo === 1) queueBox.style.color = "#d97706";
            else queueBox.style.color = "#0f172a";
        }

        // 2. อัปเดตสถานะและข้อความ
        var descBox = document.getElementById('admin-desc-text');
        var packageBox = document.getElementById('active-package');

        if (myTask) {
            // เจองาน -> อัปเดตข้อมูล
            if (descBox) descBox.innerText = myTask.description || "- กำลังดำเนินการตามคิว -";
            if (packageBox) packageBox.innerText = translateStatus(myTask.status);

            // เรียกฟังก์ชันระบายสีบาร์ (เวอร์ชั่น 3 ขั้นตอน)
            updateMyProgressBar(myTask.status);

        } else {
            // ไม่เจองาน -> รีเซ็ต
            if (descBox) descBox.innerText = "ไม่มีรายการตรวจสอบในขณะนี้";
            if (packageBox) packageBox.innerText = "พร้อมรับบริการ";
            updateMyProgressBar('none');
        }

    } catch (err) {
        console.error("Dashboard Error:", err);
    }
}

// --- 2. ฟังก์ชันช่วยระบายสี Progress Bar (ปรับใหม่สำหรับ 3 ปุ่ม) ---
function updateMyProgressBar(status) {
    // 1. รีเซ็ตสีทั้งหมดก่อน
    var allSteps = ['st-pending', 'st-inspecting', 'st-completed'];
    allSteps.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    // 2. กำหนดความยาวเส้นและจุดที่ Active
    var w = '0%';

    // Helper function ช่วยเติมสี
    function active(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('active');
    }

    if (status === 'pending') {
        w = '15%';
        active('st-pending');
    } else if (status === 'traveling') {
        // ไม่มีปุ่ม Traveling ใน HTML แล้ว ให้เส้นวิ่งไปครึ่งทาง แต่ยัง Active แค่ปุ่มแรก
        w = '50%';
        active('st-pending');
    } else if (status === 'inspecting') {
        w = '80%';
        active('st-pending');
        active('st-inspecting');
    } else if (status === 'completed') {
        w = '100%';
        active('st-pending');
        active('st-inspecting');
        active('st-completed');
    }

    // สั่งเปลี่ยนความยาวเส้น
    var bar = document.getElementById('prog-bar-fill');
    if (bar) bar.style.width = w;
}

// --- 3. ฟังก์ชันแปลภาษา ---
function translateStatus(st) {
    if (st === 'pending') return 'รอคิวตรวจสอบ';
    if (st === 'traveling') return 'เจ้าหน้าที่กำลังเดินทาง';
    if (st === 'inspecting') return 'กำลังตรวจหน้างาน';
    if (st === 'completed') return 'เสร็จสิ้น';
    return st;
}

function resetProgressBar() {
    document.querySelectorAll('.step, .line').forEach(el => el.classList.remove('active'));
}


document.addEventListener('DOMContentLoaded', () => db.init());