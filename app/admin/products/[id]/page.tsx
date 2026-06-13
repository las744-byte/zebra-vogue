'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const apiUrl = '/api/admin'

export default function ProductEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [product, setProduct] = useState<any>({
    name: '',
    description: '',
    price: '',
    old_price: '',
    category_id: '',
    is_active: true,
    article: '',
    created_at: '',
  })
  const [categories, setCategories] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const [sizes, setSizes] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [newSize, setNewSize] = useState('')
  const [newStock, setNewStock] = useState(1)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoTitle, setNewVideoTitle] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const isNew = id === 'new'
  const currentId = isNew ? savedId : id

  useEffect(() => {
    fetchCategories()
    if (!isNew) {
      loadAll()
    }
  }, [id])

  const fetchCategories = async () => {
    const res = await fetch(`${apiUrl}/categories`)
    const json = await res.json()
    setCategories(json.data || [])
  }

  const loadAll = async () => {
    const p = await fetch(`${apiUrl}/products/${currentId}`).then(r => r.json())
    setProduct(p.data)
    const im = await fetch(`${apiUrl}/product-images?product_id=${currentId}`).then(r => r.json())
    setImages(im.data || [])
    const sz = await fetch(`${apiUrl}/product-sizes?product_id=${currentId}`).then(r => r.json())
    setSizes(sz.data || [])
    const vi = await fetch(`${apiUrl}/product-videos?product_id=${currentId}`).then(r => r.json())
    setVideos(vi.data || [])
  }

  const showMsg = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const saveProduct = async () => {
    setSaving(true)
    const data = {
      name: product.name,
      description: product.description,
      price: parseInt(product.price) || 0,
      old_price: product.old_price ? parseInt(product.old_price) : null,
      category_id: product.category_id ? parseInt(product.category_id) : null,
      is_active: product.is_active,
      article: product.article,
      created_at: product.created_at || new Date().toISOString(),
    }

    if (isNew && !savedId) {
      const res = await fetch(`${apiUrl}/products`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (json.data) {
        setSavedId(json.data.id.toString())
        showMsg('Товар створено! Тепер додайте фото, розміри, відео.')
        setTimeout(() => {
          setProduct(json.data)
          loadAllAfterCreate(json.data.id)
        }, 300)
      } else {
        showMsg('Помилка: ' + JSON.stringify(json))
      }
    } else {
      await fetch(`${apiUrl}/products/${currentId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      })
      showMsg('Товар оновлено!')
    }
    setSaving(false)
  }

  const loadAllAfterCreate = async (productId: number) => {
    const im = await fetch(`${apiUrl}/product-images?product_id=${productId}`).then(r => r.json())
    setImages(im.data || [])
    const sz = await fetch(`${apiUrl}/product-sizes?product_id=${productId}`).then(r => r.json())
    setSizes(sz.data || [])
    const vi = await fetch(`${apiUrl}/product-videos?product_id=${productId}`).then(r => r.json())
    setVideos(vi.data || [])
  }

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentId) return

    const img = new window.Image()
    const reader = new FileReader()

    reader.onload = () => {
      img.src = reader.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 800
        let w = img.width
        let h = img.height
        if (w > h && w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize }
        if (h > w && h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize }

        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, w, h)

        const webpBase64 = canvas.toDataURL('image/webp', 0.6)
        const base64 = webpBase64.split(',')[1]

        fetch(`${apiUrl}/upload`, {
          method: 'POST',
          body: JSON.stringify({ fileName: file.name.replace(/\.[^/.]+$/, '') + '.webp', fileBase64: base64 }),
          headers: { 'Content-Type': 'application/json' },
        })
          .then(res => res.json())
          .then(async json => {
            if (json.data?.url) {
              await fetch(`${apiUrl}/product-images`, {
                method: 'POST',
                body: JSON.stringify({ product_id: parseInt(currentId), image_url: json.data.url, sort_order: 0 }),
                headers: { 'Content-Type': 'application/json' },
              })
              showMsg('Фото додано!')
              loadAll()
            } else {
              showMsg('Помилка завантаження фото')
            }
          })
      }
    }
    reader.readAsDataURL(file)
  }

  const deleteImage = async (imageId: number) => {
    await fetch(`${apiUrl}/product-images/${imageId}`, { method: 'DELETE' })
    showMsg('Фото видалено')
    loadAll()
  }

  const addSize = async () => {
    if (!newSize || !currentId) return
    await fetch(`${apiUrl}/product-sizes`, {
      method: 'POST',
      body: JSON.stringify({ product_id: parseInt(currentId), size: newSize, stock: newStock }),
      headers: { 'Content-Type': 'application/json' },
    })
    showMsg('Розмір додано')
    setNewSize('')
    setNewStock(1)
    loadAll()
  }

  const deleteSize = async (sizeId: number) => {
    await fetch(`${apiUrl}/product-sizes/${sizeId}`, { method: 'DELETE' })
    showMsg('Розмір видалено')
    loadAll()
  }

  const updateStock = async (sizeId: number, stock: number) => {
    await fetch(`${apiUrl}/product-sizes/${sizeId}`, {
      method: 'PUT',
      body: JSON.stringify({ stock }),
      headers: { 'Content-Type': 'application/json' },
    })
    loadAll()
  }

  const addVideo = async () => {
    if (!newVideoUrl || !currentId) return
    await fetch(`${apiUrl}/product-videos`, {
      method: 'POST',
      body: JSON.stringify({ product_id: parseInt(currentId), video_url: newVideoUrl, title: newVideoTitle }),
      headers: { 'Content-Type': 'application/json' },
    })
    showMsg('Відео додано')
    setNewVideoUrl('')
    setNewVideoTitle('')
    loadAll()
  }

  const deleteVideo = async (videoId: number) => {
    await fetch(`${apiUrl}/product-videos/${videoId}`, { method: 'DELETE' })
    showMsg('Відео видалено')
    loadAll()
  }

  const box = {
    marginTop: 20,
    padding: 20,
    background: '#f9f9f9',
    borderRadius: 8,
    border: '1px solid #e0e0e0',
  }

  const sectionTitle = {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    marginBottom: 10,
    border: '1px solid #ccc',
    borderRadius: 4,
    fontSize: 14,
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block',
    marginBottom: 4,
    fontWeight: 'bold',
    fontSize: 13,
    color: '#333',
  }

  const showExtras = !isNew || savedId

  return (
    <div style={{ padding: 30, maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => router.push('/admin')} style={{ marginBottom: 20, padding: '8px 16px', cursor: 'pointer', background: '#333', color: 'white', border: 'none', borderRadius: 4 }}>
        ← Назад до товарів
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        {isNew && !savedId ? 'Новий товар' : product.name || 'Редагування товару'}
      </h1>

      {message && (
        <div style={{ marginBottom: 15, padding: 10, background: '#d4edda', borderRadius: 4, color: '#155724' }}>
          {message}
        </div>
      )}

      <div style={box}>
        <div style={sectionTitle}>📝 Інформація про товар</div>

        <label style={labelStyle}>Назва</label>
        <input style={inputStyle} value={product.name} onChange={e => setProduct({ ...product, name: e.target.value })} />

        <label style={labelStyle}>Опис</label>
        <textarea style={{ ...inputStyle, minHeight: 80 }} value={product.description || ''} onChange={e => setProduct({ ...product, description: e.target.value })} />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Ціна (грн)</label>
            <input type="number" style={inputStyle} value={product.price} onChange={e => setProduct({ ...product, price: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Стара ціна (грн)</label>
            <input type="number" style={inputStyle} value={product.old_price || ''} onChange={e => setProduct({ ...product, old_price: e.target.value })} />
          </div>
        </div>

        <label style={labelStyle}>Категорія</label>
        <select style={inputStyle} value={product.category_id || ''} onChange={e => setProduct({ ...product, category_id: e.target.value })}>
          <option value="">— Вибрати —</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label style={labelStyle}>Артикул</label>
        <input style={inputStyle} value={product.article || ''} onChange={e => setProduct({ ...product, article: e.target.value })} />

        <label style={labelStyle}>Дата створення</label>
        <input
          type="datetime-local"
          style={inputStyle}
          value={product.created_at ? new Date(product.created_at).toISOString().slice(0, 16) : ''}
          onChange={e => setProduct({ ...product, created_at: new Date(e.target.value).toISOString() })}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <input type="checkbox" checked={product.is_active} onChange={e => setProduct({ ...product, is_active: e.target.checked })} />
          <span>Активний (показувати на сайті)</span>
        </label>

        <button
          onClick={saveProduct}
          disabled={saving}
          style={{ padding: '10px 24px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 15 }}
        >
          {saving ? 'Збереження...' : isNew && !savedId ? 'Створити товар' : '💾 Зберегти зміни'}
        </button>
      </div>

      {showExtras && (
        <>
          <div style={box}>
            <div style={sectionTitle}>📷 Фото товару</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              {images.map((img: any) => (
                <div key={img.id} style={{ position: 'relative' }}>
                  <img src={img.image_url} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 4 }} />
                  <button onClick={() => deleteImage(img.id)}
                    style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14, lineHeight: '22px' }}>×</button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" onChange={uploadImage} />
          </div>

          <div style={box}>
            <div style={sectionTitle}>📏 Розміри та залишки</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {sizes.map((s: any) => (
                <div key={s.id} style={{ border: '1px solid #ccc', padding: '8px 12px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, background: 'white' }}>
                  <strong>{s.size}</strong>
                  <input type="number" defaultValue={s.stock} onChange={e => updateStock(s.id, parseInt(e.target.value) || 0)}
                    style={{ width: 50, padding: 4 }} min="0" />
                  <span>шт.</span>
                  <button onClick={() => deleteSize(s.id)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', padding: '2px 8px' }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newSize} onChange={e => setNewSize(e.target.value)} placeholder="S, M, L, 42..." style={{ padding: '6px 10px' }} />
              <input type="number" value={newStock} onChange={e => setNewStock(parseInt(e.target.value) || 0)} placeholder="К-ть" style={{ width: 60, padding: '6px 10px' }} min="0" />
              <button onClick={addSize} style={{ padding: '6px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Додати</button>
            </div>
          </div>

          <div style={box}>
            <div style={sectionTitle}>🎬 Відео</div>
            {videos.map((v: any) => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <a href={v.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2196F3' }}>{v.title || v.video_url}</a>
                <button onClick={() => deleteVideo(v.id)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', padding: '2px 8px' }}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} placeholder="YouTube / TikTok URL" style={{ padding: '6px 10px', width: 280 }} />
              <input value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} placeholder="Назва" style={{ padding: '6px 10px', width: 180 }} />
              <button onClick={addVideo} style={{ padding: '6px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Додати</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}