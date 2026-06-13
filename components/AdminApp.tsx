'use client'

import { Admin, Resource, List, Datagrid, TextField, NumberField, BooleanField, DateField, DataProvider, TopToolbar, SearchInput, useListContext, useRecordContext } from 'react-admin'
import { useEffect, useState } from 'react'

const apiUrl = '/api/admin'

const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    let url = `${apiUrl}/${resource}`

    const queryParams = new URLSearchParams()
    if (params?.filter) {
      if (params.filter.q) queryParams.set('q', params.filter.q)
      if (params.filter.article) queryParams.set('article', params.filter.article)
      if (params.filter.category_id) queryParams.set('category_id', params.filter.category_id)
      if (params.filter.sale) queryParams.set('sale', params.filter.sale)
    }
    if (params?.sort) {
      queryParams.set('sort', params.sort.order)
    }
    const qs = queryParams.toString()
    if (qs) url += `?${qs}`

    const res = await fetch(url)
    const json = await res.json()

    const products = json.data || []

    if (resource === 'products' && products.length > 0) {
      const catRes = await fetch(`${apiUrl}/categories`)
      const catJson = await catRes.json()
      const categories = catJson.data || []
      const catMap: Record<number, string> = {}
      categories.forEach((c: any) => { catMap[Number(c.id)] = c.name })

      const ids = products.map((p: any) => p.id).join(',')
      const imgRes = await fetch(`${apiUrl}/product-first-image?ids=${ids}`)
      const imgJson = await imgRes.json()
      const images = imgJson.data || {}

      for (const p of products) {
        p.thumbnail = images[p.id] || null
        p.category_name = p.category_id ? (catMap[Number(p.category_id)] || '—') : '—'
      }
    }

    return {
      data: products,
      total: json.total || products.length,
    }
  },
  getOne: async (resource, params) => {
    const res = await fetch(`${apiUrl}/${resource}/${params.id}`)
    const json = await res.json()
    return { data: json.data }
  },
  create: async (resource, params) => {
    const res = await fetch(`${apiUrl}/${resource}`, {
      method: 'POST',
      body: JSON.stringify(params.data),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await res.json()
    return { data: json.data }
  },
  update: async (resource, params) => {
    const res = await fetch(`${apiUrl}/${resource}/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(params.data),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await res.json()
    return { data: json.data }
  },
  delete: async (resource, params) => {
    await fetch(`${apiUrl}/${resource}/${params.id}`, { method: 'DELETE' })
    return { data: { id: params.id } }
  },
}

const ThumbnailField = () => {
  const record = useRecordContext()
  if (!record?.thumbnail) return <span style={{ color: '#ccc', fontSize: 20 }}>📷</span>
  return (
    <img
      src={record.thumbnail}
      alt=""
      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
    />
  )
}

const CategoryField = () => {
  const record = useRecordContext()
  if (!record) return <span>—</span>
  return <span>{record.category_name || '—'}</span>
}

const ProductListActions = () => (
  <TopToolbar>
    <button
      onClick={() => window.location.href = '/admin/products/new'}
      style={{
        padding: '10px 20px',
        background: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 8,
      }}
    >
      + Новий товар
    </button>
    <button
      onClick={() => window.location.href = '/admin/orders'}
      style={{
        padding: '10px 20px',
        background: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 'bold',
      }}
    >
      📋 Замовлення
    </button>
  </TopToolbar>
)

const FilterBar = () => {
  const { setFilters, filterValues } = useListContext()
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    fetch(`${apiUrl}/categories`)
      .then(r => r.json())
      .then(json => setCategories(json.data || []))
  }, [])

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 16px', background: '#f5f5f5', borderRadius: 4, marginBottom: 10, flexWrap: 'wrap' }}>
      <input
        type="text"
        placeholder="Пошук за артикулом..."
        value={filterValues?.article || ''}
        onChange={e => setFilters({ ...filterValues, article: e.target.value })}
        style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, width: 180 }}
      />
      <select
        value={filterValues?.category_id || ''}
        onChange={e => setFilters({ ...filterValues, category_id: e.target.value })}
        style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}
      >
        <option value="">Всі категорії</option>
        {categories.map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '6px 10px', background: filterValues?.sale ? '#fff0f0' : '#fff', borderRadius: 4, border: filterValues?.sale ? '2px solid #cc0000' : '1px solid #ccc' }}>
        <input
          type="checkbox"
          checked={filterValues?.sale === 'true'}
          onChange={e => setFilters({ ...filterValues, sale: e.target.checked ? 'true' : '' })}
          style={{ cursor: 'pointer' }}
        />
        <span style={{ color: filterValues?.sale ? '#cc0000' : '#333', fontWeight: 600 }}>🎯 Розпродаж</span>
      </label>
      {(filterValues?.article || filterValues?.category_id || filterValues?.sale) && (
        <button
          onClick={() => setFilters({ q: filterValues?.q || '', article: '', category_id: '', sale: '' })}
          style={{ padding: '6px 12px', background: '#999', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          Скинути
        </button>
      )}
    </div>
  )
}

const ProductList = () => (
  <List
    filters={[<SearchInput source="q" alwaysOn placeholder="Пошук за назвою..." />]}
    actions={<ProductListActions />}
    aside={<FilterBar />}
    sort={{ field: 'created_at', order: 'DESC' }}
  >
    <Datagrid rowClick={(id) => { window.location.href = `/admin/products/${id}` }}>
      <ThumbnailField label="Фото" />
      <TextField source="id" label="ID" />
      <TextField source="name" label="Назва" sortable={false} />
      <TextField source="article" label="Артикул" sortable={false} />
      <CategoryField label="Категорія" />
      <NumberField source="price" label="Ціна (грн)" sortable={false} />
      <DateField source="created_at" label="Дата" showTime />
      <BooleanField source="is_active" label="Активний" sortable={false} />
    </Datagrid>
  </List>
)

export function AdminApp() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) return <div>Завантаження...</div>

  return (
    <Admin dataProvider={dataProvider}>
      <Resource
        name="products"
        list={ProductList}
        options={{ label: 'Товари' }}
      />
    </Admin>
  )
}