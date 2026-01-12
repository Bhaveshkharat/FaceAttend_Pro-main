# FaceAttend Pro 👤📸

FaceAttend Pro is a **manager-level, kiosk-based attendance management system** built using face recognition.  
Instead of individual user logins, a single manager operates the system while employees mark their attendance by simply scanning their face.

This approach makes the system **faster, more reliable, and suitable for real-world office or institutional environments**.

---

## 🚀 Key Features

### 🔐 Manager-Based Access
- Only managers log in to the system
- Employees do **not** require login credentials
- Centralized control improves security and usability

### 📸 Kiosk-Based Face Attendance
- One device acts as an attendance kiosk
- Employees scan their face to mark:
  - **Check-In**
  - **Check-Out**
- Prevents duplicate or invalid attendance entries

### 📊 Manager Dashboard
- Overview cards showing:
  - Total employees
  - Present today
  - Checked out today
- Clean and professional UI

### 🕒 Attendance History
- Date-wise attendance records
- In-time and Out-time tracking
- Search employees by name
- Export-ready design (Excel support can be added)

### 👥 Employee Management
- Register employees with face data
- View all employees in one place
- Per-employee attendance analytics
- Detailed employee attendance history

### 🚨 Leave & Exceptions
- Shows employees who are:
  - On leave
  - Late
  - Half-day
- Calculated dynamically for the current day

### 🔒 Secure Authentication
- JWT-based authentication for managers
- Proper logout flow with confirmation

---

## 🛠️ Tech Stack

### Frontend (Mobile App)
- **React Native (Expo)**
- **Expo Router**
- **TypeScript**
- **Axios**
- **Ionicons**

### Backend
- **Node.js**
- **Express.js**
- **MongoDB**
- **Mongoose**
- **JWT Authentication**

### Face Recognition
- **face-api.js**
- **TensorFlow.js (CPU)**
- Image-based face matching with descriptors

---

## 🧠 System Architecture (High-Level)

# FaceAttend Pro 👤📸

FaceAttend Pro is a **manager-level, kiosk-based attendance management system** built using face recognition.  
Instead of individual user logins, a single manager operates the system while employees mark their attendance by simply scanning their face.

This approach makes the system **faster, more reliable, and suitable for real-world office or institutional environments**.

---

## 🚀 Key Features

### 🔐 Manager-Based Access
- Only managers log in to the system
- Employees do **not** require login credentials
- Centralized control improves security and usability

### 📸 Kiosk-Based Face Attendance
- One device acts as an attendance kiosk
- Employees scan their face to mark:
  - **Check-In**
  - **Check-Out**
- Prevents duplicate or invalid attendance entries

### 📊 Manager Dashboard
- Overview cards showing:
  - Total employees
  - Present today
  - Checked out today
- Clean and professional UI

### 🕒 Attendance History
- Date-wise attendance records
- In-time and Out-time tracking
- Search employees by name
- Export-ready design (Excel support can be added)

### 👥 Employee Management
- Register employees with face data
- View all employees in one place
- Per-employee attendance analytics
- Detailed employee attendance history

### 🚨 Leave & Exceptions
- Shows employees who are:
  - On leave
  - Late
  - Half-day
- Calculated dynamically for the current day

### 🔒 Secure Authentication
- JWT-based authentication for managers
- Proper logout flow with confirmation

---

## 🛠️ Tech Stack

### Frontend (Mobile App)
- **React Native (Expo)**
- **Expo Router**
- **TypeScript**
- **Axios**
- **Ionicons**

### Backend
- **Node.js**
- **Express.js**
- **MongoDB**
- **Mongoose**
- **JWT Authentication**

### Face Recognition
- **face-api.js**
- **TensorFlow.js (CPU)**
- Image-based face matching with descriptors

---

## 🧠 System Architecture (High-Level)

Manager Login
↓
Manager Dashboard
↓
Attendance Kiosk (Camera)
↓
Face Recognition
↓
Check-In / Check-Out Logic
↓
MongoDB Attendance Records
↓
History / Profile / Leave Analytics


---

## ✅ Attendance Logic (Important)

- **First scan of the day** → Check-In (`IN`)
- **Second scan of the day** → Check-Out (`OUT`)
- A user **cannot check out without checking in**
- No duplicate or invalid records are allowed

This ensures **data integrity** and matches real biometric attendance systems.

---

## 🧪 How to Run the Project

### Backend
```bash
cd backend
npm install
npm run dev

📌 Use Case

FaceAttend Pro is suitable for:

Offices

Colleges & training institutes

Small to medium organizations

Internship & academic projects

Real-world attendance system demos

🏁 Future Enhancements

Excel export for attendance history

Monthly attendance reports

Leave approval workflow

Role-based permissions

Cloud deployment

👨‍💻 Author

Developed with a focus on real-world usability, clean architecture, and professional UI/UX.

⭐ If you find this project useful, feel free to star the repository!

