// ---------- App.js ----------
  // ---------- Constants & Storage Keys ----------
  const LS_TEACHER = 'nu_teacher_v1';
  const LS_COURSES = 'nu_courses_v1';           // array of courses
  const LS_STUDENTS = 'nu_students_v1';         // { [courseId]: [ {id,name} ] }
  const LS_ATT = 'nu_attendance_v1';            // { [courseId]: { [date]: [ {id,name,status,note} ] } }

  const SAMPLE_COURSES = [
    { id: 'CSE101', name: 'Web Development', dept: 'Computer Science', time: '10:00 AM - 11:30 AM' },
    { id: 'CSE202', name: 'Data Structures', dept: 'CSE', time: '12:00 PM - 01:30 PM' }
  ];
  const SAMPLE_STUDENTS = [
    { id: '21001', name: 'sabrina' },
    { id: '21002', name: 'akter' },
    { id: '21003', name: 'zannat' },
    { id: '21004', name: 'mim' },
    { id: '21005', name: 'sadia' }
  ];

  const $ = sel => document.querySelector(sel);

  // ---------- Helpers ----------
  const todayISO = () => new Date().toISOString().slice(0,10);
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  function ensureSeed() {
    if (!load(LS_COURSES)) save(LS_COURSES, SAMPLE_COURSES);
    const stuMap = load(LS_STUDENTS) || {};
    SAMPLE_COURSES.forEach(c=>{ if(!stuMap[c.id]) stuMap[c.id] = [...SAMPLE_STUDENTS]; });
    save(LS_STUDENTS, stuMap);
    if (!load(LS_ATT)) save(LS_ATT, {});
  }

  // ---------- Login Flow ----------
  $('#loginForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const teacher = { name: $('#teacherName').value.trim(), id: $('#teacherId').value.trim() };
    if(!teacher.name || !teacher.id) return alert('Please enter both fields.');
    save(LS_TEACHER, teacher);
    boot();
  });

  $('#logoutBtn').addEventListener('click', () => {
    localStorage.removeItem(LS_TEACHER);
    location.reload();
  });

  function boot(){
    ensureSeed();
    const t = load(LS_TEACHER);
    if(!t){ $('#app').classList.add('hidden'); $('#loginPage').classList.remove('hidden'); return; }
    $('#whoami').textContent = `${t.name} (${t.id})`;
    $('#loginPage').classList.add('hidden');
    $('#app').classList.remove('hidden');
    renderCoursesTable();
    hydrateCourseSelectors();
    $('#attDate').value = todayISO();
    renderAttendanceTable();
  }

  // ---------- Tabs ----------
  document.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab').forEach(b=>{ b.classList.remove('bg-blue-600','text-white'); b.classList.add('bg-white','border'); });
      btn.classList.remove('bg-white','border');
      btn.classList.add('bg-blue-600','text-white');
      const tab = btn.dataset.tab;
      ['dashboard','attendance','summary'].forEach(id=>$('#'+id+'Tab').classList.add('hidden'));
      $('#'+tab+'Tab').classList.remove('hidden');
      if(tab==='summary') updateSummarySelectors();
    });
  });

  // ---------- Dashboard ----------
  function renderCoursesTable(){
    const courses = load(LS_COURSES, []);
    const stuMap = load(LS_STUDENTS, {});
    $('#courseCount').textContent = courses.length;
    const rows = courses.map(c=>{
      const n = (stuMap[c.id]||[]).length;
      return `<tr class="border-b">
        <td class="py-2">${escapeHtml(c.name)} (${c.id})</td>
        <td class="py-2">${escapeHtml(c.dept)}</td>
        <td class="py-2">${escapeHtml(c.time)}</td>
        <td class="py-2">${n}</td>
        <td class="py-2 text-right">
          <button class="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs" onclick="gotoAttendance('${c.id}')">Take Attendance</button>
        </td>
      </tr>`;
    }).join('');
    $('#courseTbody').innerHTML = rows || `<tr><td colspan="5" class="text-center py-6 text-gray-500">No courses</td></tr>`;
  }

  function gotoAttendance(courseId){
    $('.tab[data-tab="attendance"]').click();
    $('#courseSelect').value = courseId;
    renderAttendanceTable();
  }

  // ---------- Attendance Page ----------
  function hydrateCourseSelectors(){
    const courses = load(LS_COURSES, []);
    const opts = courses.map(c=>`<option value="${escapeAttr(c.id)}">${escapeHtml(c.name)} (${c.id})</option>`).join('');
    $('#courseSelect').innerHTML = opts;
  }

  $('#courseSelect').addEventListener('change', ()=>{ renderAttendanceTable(); updateSavedCount(); });
  $('#attDate').addEventListener('change', ()=>{ renderAttendanceTable(); updateSavedCount(); });
  $('#search').addEventListener('input', (e)=> renderAttendanceTable(e.target.value));

  function renderAttendanceTable(filter=''){
    const courseId = $('#courseSelect').value || (load(LS_COURSES, [])[0]?.id);
    const date = $('#attDate').value || todayISO();
    if(!courseId) return;

    const stuMap = load(LS_STUDENTS, {});
    const attAll = load(LS_ATT, {});
    const savedRows = attAll?.[courseId]?.[date];
    const rows = savedRows || (stuMap[courseId]||[]).map(s=>({ ...s, status:'present', note:'' }));

    const q = filter.trim().toLowerCase();
    const tbody = $('#studentsTable tbody');
    tbody.innerHTML = '';
    rows.forEach((r, i)=>{
      if(q && !(String(r.name).toLowerCase().includes(q) || String(r.id).toLowerCase().includes(q))) return;
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-gray-50';
      tr.innerHTML = `
        <td class="p-3">${i+1}</td>
        <td class="p-3">${escapeHtml(r.name)}</td>
        <td class="p-3">${escapeHtml(r.id)}</td>
        <td class="p-3">
          <select class="status px-2 py-1 rounded-lg border" data-idx="${i}">
            <option value="present" ${r.status==='present'?'selected':''}>Present</option>
            <option value="absent" ${r.status==='absent'?'selected':''}>Absent</option>
          </select>
        </td>
        <td class="p-3"><input class="note w-full px-2 py-1 rounded-lg border" data-note-idx="${i}" value="${escapeAttr(r.note||'')}" placeholder="optional note"/></td>`;
      tbody.appendChild(tr);
    });

    updateSavedCount();
  }

  function updateSavedCount(){
    const courseId = $('#courseSelect').value;
    const all = load(LS_ATT, {});
    const obj = all[courseId] || {};
    $('#savedCount').textContent = Object.keys(obj).length;
  }

  function collectTable(){
    const tbody = $('#studentsTable tbody');
    const rows = [...tbody.querySelectorAll('tr')].map(tr=>{
      const tds = tr.querySelectorAll('td');
      return {
        name: tds[1].innerText,
        id: tds[2].innerText,
        status: tr.querySelector('select.status').value,
        note: tr.querySelector('input.note').value
      };
    });
    return rows;
  }

  $('#saveBtn').addEventListener('click', ()=>{
    const courseId = $('#courseSelect').value;
    const date = $('#attDate').value || todayISO();
    const rows = collectTable();
    const all = load(LS_ATT, {});
    if(!all[courseId]) all[courseId] = {};
    all[courseId][date] = rows;
    save(LS_ATT, all);
    updateSavedCount();
    alert('Saved attendance for '+date);
  });

  $('#markAllPresent').addEventListener('click', ()=>{
    document.querySelectorAll('#studentsTable select.status').forEach(s=> s.value='present');
  });
  $('#markAllAbsent').addEventListener('click', ()=>{
    document.querySelectorAll('#studentsTable select.status').forEach(s=> s.value='absent');
  });

  // Add/Reset/Clear
  $('#addForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const courseId = $('#courseSelect').value;
    const map = load(LS_STUDENTS, {});
    const name = $('#stuName').value.trim();
    const id = $('#stuId').value.trim();
    if(!name || !id) return alert('Enter name and ID');
    map[courseId] = map[courseId] || [];
    map[courseId].push({ id, name });
    save(LS_STUDENTS, map);
    $('#stuName').value=''; $('#stuId').value='';
    renderAttendanceTable($('#search').value);
    renderCoursesTable();
  });

  $('#randomBtn').addEventListener('click', ()=>{
    const s = SAMPLE_STUDENTS[Math.floor(Math.random()*SAMPLE_STUDENTS.length)];
    const map = load(LS_STUDENTS, {});
    const cid = $('#courseSelect').value;
    map[cid] = map[cid] || [];
    map[cid].push({...s, id: s.id + Math.floor(Math.random()*90+10)});
    save(LS_STUDENTS, map);
    renderAttendanceTable($('#search').value);
    renderCoursesTable();
  });

  $('#resetSample').addEventListener('click', ()=>{
    if(!confirm('Reset current course students to sample list?')) return;
    const cid = $('#courseSelect').value;
    const map = load(LS_STUDENTS, {});
    map[cid] = [...SAMPLE_STUDENTS];
    save(LS_STUDENTS, map);
    renderAttendanceTable($('#search').value);
    renderCoursesTable();
  });

  $('#clearData').addEventListener('click', ()=>{
    if(!confirm('Clear ALL attendance & students for ALL courses?')) return;
    localStorage.removeItem(LS_ATT);
    localStorage.removeItem(LS_STUDENTS);
    ensureSeed();
    hydrateCourseSelectors();
    renderAttendanceTable();
    renderCoursesTable();
  });

  // Export CSV for selected date
  $('#exportCsv').addEventListener('click', ()=>{
    const cid = $('#courseSelect').value; const date = $('#attDate').value || todayISO();
    const all = load(LS_ATT, {}); const rows = all?.[cid]?.[date];
    if(!rows || !rows.length) return alert('No records for '+date);
    const header = ['No','Name','StudentID','Status','Note'];
    const csv = [header.join(',')].concat(rows.map((r,i)=>[
      i+1,
      '"'+String(r.name).replace(/"/g,'""')+'"',
      '"'+String(r.id).replace(/"/g,'""')+'"',
      r.status,
      '"'+String(r.note||'').replace(/"/g,'""')+'"'
    ].join(','))).join('');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${cid}-attendance-${date}.csv`; a.click(); URL.revokeObjectURL(url);
  });

  // Export ALL dates (sequential downloads)
  $('#exportAll').addEventListener('click', ()=>{
    const cid = $('#courseSelect').value; const all = load(LS_ATT, {}); const obj = all?.[cid]||{}; const keys = Object.keys(obj);
    if(keys.length===0) return alert('No saved dates.');
    if(!confirm(`Export ${keys.length} CSV file(s)?`)) return;
    keys.sort().forEach((d,i)=> setTimeout(()=>{
      $('#attDate').value = d; renderAttendanceTable(); document.getElementById('exportCsv').click();
    }, i*500));
  });

  // Report inside Attendance tab
  $('#showReport').addEventListener('click', ()=>{
    const cid = $('#courseSelect').value; const all = load(LS_ATT, {}); const obj = all?.[cid]||{}; const dates = Object.keys(obj);
    const map = {};
    dates.forEach(date=>{
      (obj[date]||[]).forEach(r=>{
        const k = r.id || r.name; if(!map[k]) map[k] = { name:r.name, id:r.id, present:0, total:0 };
        if(r.status==='present') map[k].present++; map[k].total++;
      });
    });
    const arr = Object.values(map).map(s=>({ ...s, percent: s.total? Math.round((s.present/s.total)*100) : 0 })).sort((a,b)=>b.percent-a.percent);
    const list = arr.map(r=>`<div class="flex items-center justify-between py-2">
      <div><b>${escapeHtml(r.name)}</b><div class="text-xs text-gray-500">${escapeHtml(r.id)}</div></div>
      <div class="text-right"><div class="font-semibold">${r.percent}%</div><div class="text-xs text-gray-500">${r.present}/${r.total} present</div></div>
    </div>`).join('');
    $('#reportList').innerHTML = list || '<div class="text-sm text-gray-500">No saved attendance.</div>';
    $('#reportArea').classList.remove('hidden');
  });

  // ---------- Summary Tab (semester view) ----------
  function updateSummarySelectors(){
    const courses = load(LS_COURSES, []);
    $('#summaryCourse').innerHTML = courses.map(c=>`<option value="${escapeAttr(c.id)}">${escapeHtml(c.name)} (${c.id})</option>`).join('');
    if(!$('#fromDate').value) $('#fromDate').value = todayISO();
    if(!$('#toDate').value) $('#toDate').value = todayISO();
  }

  $('#runSummary').addEventListener('click', ()=>{
    const cid = $('#summaryCourse').value; const from = $('#fromDate').value; const to = $('#toDate').value;
    const all = load(LS_ATT, {}); const obj = all?.[cid]||{}; const dates = Object.keys(obj).filter(d=>(!from||d>=from) && (!to||d<=to));
    const map = {};
    dates.forEach(date=>{
      (obj[date]||[]).forEach(r=>{
        const k = r.id || r.name; if(!map[k]) map[k] = { name:r.name, id:r.id, present:0, total:0 };
        if(r.status==='present') map[k].present++; map[k].total++;
      });
    });
    const arr = Object.values(map).map(s=>({ ...s, percent: s.total? Math.round((s.present/s.total)*100) : 0 })).sort((a,b)=>b.percent-a.percent);
    const html = `
      <div class="overflow-auto rounded-xl border">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr class="text-gray-500">
              <th class="text-left p-3">Name</th>
              <th class="text-left p-3">ID</th>
              <th class="text-left p-3">Present</th>
              <th class="text-left p-3">Total</th>
              <th class="text-left p-3">Percent</th>
            </tr>
          </thead>
          <tbody>
            ${arr.map(r=>`<tr class="border-b">
              <td class="p-3">${escapeHtml(r.name)}</td>
              <td class="p-3">${escapeHtml(r.id)}</td>
              <td class="p-3">${r.present}</td>
              <td class="p-3">${r.total}</td>
              <td class="p-3 font-semibold">${r.percent}%</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    $('#summaryResult').innerHTML = html || '<div class="text-sm text-gray-500">No data in this range.</div>';
  });

  // ---------- Escapes ----------
  function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
  function escapeAttr(s){ return String(s||'').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

  // ---------- Init ----------
  boot();
  