# 🌙 Nocturne Stays

A modern **full-stack hotel booking platform** featuring secure authentication, role-based access control, and streamlined booking workflows.

---

## ⚡ Live Demo

https://nocturne-stays.vercel.app/

---

## 🛠 Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| **Frontend** | Vanilla JavaScript, Tailwind CSS, Fetch API |
| **Backend**  | Node.js, Express.js                         |
| **Database** | Supabase (PostgreSQL)                       |
| **Hosting**  | Vercel (Frontend), Render (Backend)         |

---

## ✨ Key Features

* 🔐 **JWT Authentication** (User & Admin Roles)
* 🏨 **Dynamic Hotel Listings** with real-time pricing calculation
* 📊 **Admin Dashboard** to approve or decline bookings
* 🖥️ **Responsive Dark UI** with modern glassmorphism design
* 💳 **Pay-at-Hotel Workflow** (No payment gateway required)

---

## 🔑 Default Credentials

> ⚠️ *For testing/demo purposes only. Change in production.*

* **Email:** [admin@nocturne.stays]
* **Password:** Admin@2467

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Owais-Ahmed-Siddiqui/nocturne-stays.git
cd nocturne-stays
```

### 2. Setup Environment Variables

Create a `.env` file in your backend folder:

```
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_secret_key
```

### 3. Run Backend

```bash
cd backend
npm install
npm start
```

### 4. Run Frontend

Open `index.html` or deploy via Vercel.

---

## 🌐 Deployment

* **Frontend:** Deploy on Vercel
* **Backend:** Deploy on Render
* **Database:** Managed via Supabase

---

## 📌 Notes

* `.env` and `node_modules` are intentionally excluded from GitHub for security and performance.
* Ensure environment variables are properly set in **Render** and **Vercel dashboards**.

---

## 📄 License

This project is for educational purposes. Modify and use as needed.

---

## 👨‍💻 Author

**Owais Ahmed Siddiqui**

---
