fetch('https://ine-lovat.vercel.app/assets/index-BhLb8i07.js').then(r=>r.text()).then(t=>{ const match = t.match(/https:\/\/[^\"]+\.onrender\.com/); console.log(match ? match[0] : 'Not found'); });
