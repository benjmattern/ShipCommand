const { useEffect, useMemo, useState } = React;

const initialRecords = [
  {
    id: 101,
    priority: 1,
    featureName: 'Customer portal search',
    impactedMicroservices: 'Search API, UI Gateway',
    status: 'Planned',
    description: 'Add a more relevant result ordering experience for customer browsing.'
  },
  {
    id: 102,
    priority: 2,
    featureName: 'Shipment event notifications',
    impactedMicroservices: 'Notification Service',
    status: 'In Progress',
    description: 'Surface shipment updates in near real time for internal operations.'
  },
  {
    id: 103,
    priority: 3,
    featureName: 'Audit export workflow',
    impactedMicroservices: 'Reporting API',
    status: 'Blocked',
    description: 'Support downloadable audit exports for regulated reporting workflows.'
  }
];

const emptyDraft = () => ({
  id: '',
  priority: '',
  featureName: '',
  impactedMicroservices: '',
  status: 'Planned',
  description: ''
});

function normalizePriorities(items) {
  const sorted = [...items].sort((a, b) => {
    const priorityA = Number(a.priority) || Number.MAX_SAFE_INTEGER;
    const priorityB = Number(b.priority) || Number.MAX_SAFE_INTEGER;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return String(a.featureName).localeCompare(String(b.featureName));
  });

  return sorted.map((item, index) => ({ ...item, priority: index + 1 }));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(value);
      if (row.some((cell) => cell !== '')) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell !== '')) {
      rows.push(row);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const records = rows.slice(1).map((rowValues) => {
    const item = {};
    headers.forEach((header, index) => {
      const value = rowValues[index] || '';
      if (header.includes('priority')) item.priority = Number(value) || '';
      else if (header.includes('id')) item.id = value;
      else if (header.includes('feature') && header.includes('name')) item.featureName = value;
      else if (header.includes('microservice')) item.impactedMicroservices = value;
      else if (header.includes('status')) item.status = value || 'Planned';
      else if (header.includes('description')) item.description = value;
    });
    return item;
  });

  return records.filter((item) => item.featureName || item.description || item.id);
}

function normalizeImportedRecord(item, index) {
  return {
    id: Number(item.id) || index + 1000,
    priority: Number(item.priority) || index + 1,
    featureName: item.featureName || `Imported feature ${index + 1}`,
    impactedMicroservices: item.impactedMicroservices || '',
    status: item.status || 'Planned',
    description: item.description || ''
  };
}

function parseExcelWorkbookFromBuffer(buffer) {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  return rows.map((row) => ({
    id: row.id || row.ID || '',
    priority: Number(row.priority || row.Priority || '') || '',
    featureName: row.featureName || row['Feature Name'] || row['Feature name'] || '',
    impactedMicroservices: row.impactedMicroservices || row['Impacted Microservices'] || row['Impacted microservices'] || '',
    status: row.status || row.Status || 'Planned',
    description: row.description || row['Feature Description'] || row['Feature description'] || ''
  }));
}

function parseExcelWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const normalized = parseExcelWorkbookFromBuffer(event.target.result);
        resolve(normalized);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsArrayBuffer(file);
  });
}

async function loadDefaultBacklogWorkbook() {
  const candidates = [
    ...(window.__BACKLOG_CANDIDATES__ || []),
    '/src/data/BacklogData.xlsx',
    '/src/data/BacklogData.csv',
    '/BacklogData/BacklogData.xlsx',
    '/BacklogData/BacklogData.csv',
    '/BacklogData.xlsx',
    '/BacklogData.csv'
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: 'no-store' });
      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';

      if (candidate.endsWith('.csv') || contentType.includes('text/csv')) {
        const text = await response.text();
        return parseCsv(text);
      }

      if (candidate.endsWith('.xlsx') || contentType.includes('officedocument') || contentType.includes('spreadsheetml')) {
        const arrayBuffer = await response.arrayBuffer();
        return parseExcelWorkbookFromBuffer(arrayBuffer);
      }
    } catch (error) {
      // Try the next candidate.
    }
  }

  return [];
}

function App() {
  const [records, setRecords] = useState(initialRecords);
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [importHint, setImportHint] = useState('Upload a CSV or XLSX export from Excel to seed the backlog.');

  const sortedRecords = useMemo(() => normalizePriorities(records), [records]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaceData() {
      try {
        const importedItems = await loadDefaultBacklogWorkbook();
        if (cancelled || !importedItems.length) return;

        const normalizedImported = importedItems.map(normalizeImportedRecord);
        setRecords(normalizePriorities(normalizedImported));
        setImportHint(`Loaded ${normalizedImported.length} backlog items from the workspace data file.`);
      } catch (error) {
        // Keep the sample data if no workbook is found.
      }
    }

    loadWorkspaceData();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    const nextItem = {
      ...draft,
      id: draft.id ? Number(draft.id) : Date.now(),
      priority: draft.priority ? Number(draft.priority) : 1,
      featureName: draft.featureName.trim(),
      impactedMicroservices: draft.impactedMicroservices.trim(),
      status: draft.status.trim() || 'Planned',
      description: draft.description.trim()
    };

    if (!nextItem.featureName) {
      setImportHint('Please provide a feature name before saving.');
      return;
    }

    if (editingId !== null) {
      const updated = records.map((item) => (item.id === editingId ? nextItem : item));
      setRecords(normalizePriorities(updated));
      setEditingId(null);
    } else {
      setRecords(normalizePriorities([...records, nextItem]));
    }

    setDraft(emptyDraft());
    setImportHint('Saved successfully.');
  }

  function handleEdit(item) {
    setDraft({
      id: item.id,
      priority: item.priority,
      featureName: item.featureName,
      impactedMicroservices: item.impactedMicroservices,
      status: item.status,
      description: item.description
    });
    setEditingId(item.id);
    setImportHint('Editing an existing backlog item.');
  }

  function handleDelete(id) {
    const nextRecords = records.filter((item) => item.id !== id);
    setRecords(normalizePriorities(nextRecords));
    if (editingId === id) {
      setEditingId(null);
      setDraft(emptyDraft());
    }
    setImportHint('Deleted backlog item.');
  }

  function moveItem(id, direction) {
    const currentIndex = records.findIndex((item) => item.id === id);
    if (currentIndex < 0) return;
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= records.length) return;
    const nextRecords = [...records];
    const [item] = nextRecords.splice(currentIndex, 1);
    nextRecords.splice(nextIndex, 0, item);
    setRecords(normalizePriorities(nextRecords));
    setImportHint('Reordered backlog cards.');
  }

  async function handleImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      let importedItems = [];
      const name = file.name.toLowerCase();
      if (name.endsWith('.csv')) {
        const text = await file.text();
        importedItems = parseCsv(text);
      } else if (name.endsWith('.xlsx')) {
        importedItems = await parseExcelWorkbook(file);
      } else {
        throw new Error('Please upload a CSV or XLSX file.');
      }

      if (!importedItems.length) {
        throw new Error('No backlog rows were found in that file.');
      }

      const normalizedImported = importedItems.map(normalizeImportedRecord);

      setRecords(normalizePriorities([...records, ...normalizedImported]));
      setImportHint(`Imported ${normalizedImported.length} backlog items.`);
    } catch (error) {
      setImportHint(error.message || 'Import failed.');
    } finally {
      event.target.value = '';
    }
  }

  return React.createElement(
    'main',
    { style: { fontFamily: 'Arial, sans-serif', background: '#020617', color: '#f8fafc', minHeight: '100vh', padding: '2rem' } },
    React.createElement(
      'div',
      { style: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gap: '1.5rem' } },
      React.createElement(
        'header',
        null,
        React.createElement('p', { style: { color: '#38bdf8', letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: '0.8rem', margin: 0 } }, 'ShipCommand'),
        React.createElement('h1', { style: { fontSize: '2rem', margin: '0.4rem 0 0' } }, 'Product backlog module'),
        React.createElement('p', { style: { color: '#94a3b8', maxWidth: '800px', margin: '0.6rem 0 0' } }, 'Create, update, delete, import, and reorder product backlog items. Priority values are normalized so the list always stays sequential.')
      ),
      React.createElement(
        'section',
        { style: { display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(280px, 360px) 1fr', alignItems: 'start' } },
        React.createElement(
          'div',
          { style: { border: '1px solid #1e293b', borderRadius: '1rem', background: '#0f172a', padding: '1rem', boxShadow: '0 10px 30px rgba(2,6,23,0.4)' } },
          React.createElement('h2', { style: { marginTop: 0 } }, editingId ? 'Edit backlog item' : 'Add backlog item'),
          React.createElement('form', { onSubmit: handleSubmit, style: { display: 'grid', gap: '0.75rem' } },
            React.createElement('input', { value: draft.id, onChange: (event) => setDraft({ ...draft, id: event.target.value }), placeholder: 'ID number', style: inputStyle }),
            React.createElement('input', { value: draft.priority, onChange: (event) => setDraft({ ...draft, priority: event.target.value }), placeholder: 'Priority number', style: inputStyle }),
            React.createElement('input', { value: draft.featureName, onChange: (event) => setDraft({ ...draft, featureName: event.target.value }), placeholder: 'Feature name', style: inputStyle }),
            React.createElement('input', { value: draft.impactedMicroservices, onChange: (event) => setDraft({ ...draft, impactedMicroservices: event.target.value }), placeholder: 'Impacted microservices', style: inputStyle }),
            React.createElement('select', { value: draft.status, onChange: (event) => setDraft({ ...draft, status: event.target.value }), style: inputStyle },
              React.createElement('option', { value: 'Planned' }, 'Planned'),
              React.createElement('option', { value: 'In Progress' }, 'In Progress'),
              React.createElement('option', { value: 'Blocked' }, 'Blocked'),
              React.createElement('option', { value: 'Done' }, 'Done')
            ),
            React.createElement('textarea', { value: draft.description, onChange: (event) => setDraft({ ...draft, description: event.target.value }), placeholder: 'Feature description', rows: 4, style: { ...inputStyle, minHeight: '90px', resize: 'vertical' } }),
            React.createElement('button', { type: 'submit', style: buttonStyle }, editingId ? 'Save changes' : 'Add backlog item')
          ),
          React.createElement('div', { style: { marginTop: '0.9rem', color: '#94a3b8', fontSize: '0.92rem' } }, importHint)
        ),
        React.createElement(
          'div',
          null,
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' } },
            React.createElement('h2', { style: { margin: 0 } }, 'Backlog cards'),
            React.createElement('label', { style: { cursor: 'pointer', color: '#38bdf8', fontWeight: 600 } },
              'Import Excel/CSV',
              React.createElement('input', { type: 'file', accept: '.csv,.xlsx', onChange: handleImport, style: { display: 'none' } })
            )
          ),
          React.createElement('div', { style: { display: 'grid', gap: '0.85rem' } },
            ...sortedRecords.map((item) => React.createElement('article', { key: item.id, style: { border: '1px solid #1e293b', borderRadius: '1rem', background: '#111827', padding: '1rem' } },
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' } },
                React.createElement('div', null,
                  React.createElement('div', { style: { color: '#38bdf8', fontWeight: 700 } }, `PBI #${item.id}`),
                  React.createElement('div', { style: { fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem' } }, item.featureName)
                ),
                React.createElement('div', { style: { textAlign: 'right' } },
                  React.createElement('div', { style: { color: '#fbbf24', fontWeight: 700 } }, `Priority ${item.priority}`),
                  React.createElement('div', { style: { marginTop: '0.25rem', color: '#94a3b8' } }, item.status)
                )
              ),
              React.createElement('div', { style: { marginTop: '0.85rem', color: '#cbd5e1' } }, item.description || 'No description provided.'),
              React.createElement('div', { style: { marginTop: '0.65rem', color: '#94a3b8', fontSize: '0.92rem' } }, `Impacted services: ${item.impactedMicroservices || 'Not listed'}`),
              React.createElement('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.85rem' } },
                React.createElement('button', { onClick: () => moveItem(item.id, 'up'), style: smallButtonStyle }, 'Move up'),
                React.createElement('button', { onClick: () => moveItem(item.id, 'down'), style: smallButtonStyle }, 'Move down'),
                React.createElement('button', { onClick: () => handleEdit(item), style: smallButtonStyle }, 'Edit'),
                React.createElement('button', { onClick: () => handleDelete(item.id), style: { ...smallButtonStyle, borderColor: '#ef4444', color: '#fda4af' } }, 'Delete')
              )
            ))
          )
        )
      )
    )
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  borderRadius: '0.65rem',
  border: '1px solid #334155',
  background: '#020617',
  color: '#f8fafc'
};

const buttonStyle = {
  padding: '0.75rem 0.95rem',
  borderRadius: '0.7rem',
  border: '1px solid #38bdf8',
  background: '#38bdf8',
  color: '#020617',
  fontWeight: 700,
  cursor: 'pointer'
};

const smallButtonStyle = {
  padding: '0.45rem 0.7rem',
  borderRadius: '0.6rem',
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#e2e8f0',
  cursor: 'pointer'
};

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(React.createElement(App));
