'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

const apiUrl = '/api/admin'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [product, setProduct] = useState<any>(null)
  const [images, setImages] = useState<any[]>([])
  const [sizes, setSizes] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [showFullImage, setShowFullImage] = useState<string | null>(null)

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    const p = await fetch(`${apiUrl}/products/${id}`).then(r => r.json())
    setProduct(p.data)

    const im = await fetch(`${apiUrl}/product-images?product_id=${id}`).then(r => r.json())
    setImages(im.data || [])

    const sz = await fetch(`${apiUrl}/product-sizes?product_id=${id}`).then(r => r.json())
    setSizes(sz.data || [])

    const vi = await fetch(`${apiUrl}/product-videos?product_id=${id}`).then(r => r.json())
    setVideos(vi.data || [])
  }

  const addToCart = () => {
    if (sizes.length > 0 && !selectedSize) {
      alert('Оберіть розмір')
      return
    }
    const cart = JSON.parse(localStorage.getItem('zebra_cart') || '[]')
    const size = selectedSize || 'Без розміру'
    const existing = cart.find((item: any) => item.product.id === product.id && item.size === size)
    if (existing) {
      existing.quantity += 1
    } else {
      cart.push({ product, size, quantity: 1 })
    }
    localStorage.setItem('zebra_cart', JSON.stringify(cart))
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (!product) return <div style={{ padding: 60, textAlign: 'center', fontSize: 14 }}>Завантаження...</div>

  const mainImage = selectedImage || (images.length > 0 ? images[0].image_url : null)

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) return `https://www.youtube.com/embed/${url.split('v=')[1]?.split('&')[0]}`
    if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1]?.split('?')[0]}`
    return url
  }

  return (
    <div style={{ fontFamily: "'Inter', 'Arial', sans-serif", background: '#fff', color: '#111', minHeight: '100vh' }}>
      {/* Шапка */}
      <header style={{ background: '#000', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>←</button>
          <Image src="/zebra logo.png" alt="ZEBRA" width={32} height={32} style={{ objectFit: 'contain', filter: 'brightness(100)' }} />
          <span style={{ fontWeight: 900, letterSpacing: 3, color: '#fff', fontSize: 16 }}>ZEBRA</span>
        </div>
      </header>

      {/* Основний контент */}
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '30px 20px',
        background: 'url("/zebra fon.jpeg") center/cover no-repeat',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
            {/* Галерея */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div
                style={{
                  width: '100%', aspectRatio: '1', background: '#f5f5f5', borderRadius: 4,
                  overflow: 'hidden', marginBottom: 10, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: mainImage ? 'zoom-in' : 'default',
                  position: 'relative',
                }}
                onClick={() => mainImage && setShowFullImage(mainImage)}
              >
                {mainImage ? (
                  <Image src={mainImage} alt={product.name || ''} fill style={{ objectFit: 'contain' }} sizes="600px" />
                ) : (
                  <Image src="/zebra logo.png" alt="" width={80} height={80} style={{ opacity: 0.15 }} />
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {images.map((img: any) => (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImage(img.image_url)}
                    style={{
                      width: 60, height: 60, borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                      border: selectedImage === img.image_url ? '2px solid #000' : '1px solid #ddd',
                      position: 'relative',
                    }}
                  >
                    <Image src={img.image_url} alt="" fill style={{ objectFit: 'cover' }} sizes="60px" />
                  </div>
                ))}
                {videos.map((v: any) => (
                  <div
                    key={v.id}
                    onClick={() => window.open(v.video_url, '_blank')}
                    style={{
                      width: 60, height: 60, borderRadius: 2, cursor: 'pointer',
                      border: '1px solid #ddd', background: '#000', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16
                    }}
                  >
                    ▶️
                  </div>
                ))}
              </div>
            </div>

            {/* Інформація */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 10, color: '#999', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                {product.category_name || ''}
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: 1, marginBottom: 8 }}>{product.name}</h1>

              {product.old_price && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#999', textDecoration: 'line-through', marginRight: 6 }}>{product.old_price} ГРН</span>
                  <span style={{ background: '#cc0000', color: '#fff', padding: '2px 6px', borderRadius: 2, fontSize: 10, fontWeight: 'bold' }}>
                    -{Math.round((1 - product.price / product.old_price) * 100)}%
                  </span>
                </div>
              )}
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 14 }}>{product.price} ГРН</div>

              {product.description && (
                <p style={{ color: '#555', lineHeight: 1.5, fontSize: 13, marginBottom: 16 }}>{product.description}</p>
              )}

              {/* Розміри */}
              {sizes.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, letterSpacing: 1, marginBottom: 6 }}>РОЗМІР:</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {sizes.filter((s: any) => s.stock > 0).map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSize(s.size)}
                        style={{
                          padding: '8px 14px',
                          border: selectedSize === s.size ? '2px solid #000' : '1px solid #ccc',
                          background: selectedSize === s.size ? '#000' : '#fff',
                          color: selectedSize === s.size ? '#fff' : '#000',
                          cursor: 'pointer', fontSize: 12, letterSpacing: 1,
                        }}
                      >
                        {s.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.article && (
                <div style={{ color: '#999', fontSize: 11, letterSpacing: 1, marginBottom: 16 }}>АРТИКУЛ: {product.article}</div>
              )}

              <button
                onClick={addToCart}
                disabled={sizes.length > 0 && !selectedSize}
                style={{
                  width: '100%', padding: 14,
                  background: added ? '#4CAF50' : (sizes.length > 0 && !selectedSize ? '#ccc' : '#000'),
                  color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, letterSpacing: 2,
                  cursor: 'pointer', transition: 'background 0.3s',
                }}
              >
                {added ? '✅ ДОДАНО!' : (sizes.length > 0 && !selectedSize ? 'ОБЕРІТЬ РОЗМІР' : '🛒 ДОДАТИ В КОШИК')}
              </button>

              {/* Відео */}
              {videos.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1, marginBottom: 10 }}>🎬 ВІДЕО</h3>
                  {videos.map((v: any) => (
                    <div key={v.id} style={{ marginBottom: 8 }}>
                      <a href={v.video_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#000', textDecoration: 'underline', fontSize: 12 }}>
                        ▶ {v.title || 'Дивитися відео'}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модальне вікно для фото */}
      {showFullImage && (
        <div onClick={() => setShowFullImage(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'pointer'
        }}>
          <Image src={showFullImage} alt="" width={1200} height={1200} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} />
          <button onClick={() => setShowFullImage(null)} style={{
            position: 'absolute', top: 16, right: 24, background: '#fff', color: '#000',
            border: 'none', width: 30, height: 30, fontSize: 14, cursor: 'pointer', fontWeight: 'bold'
          }}>✕</button>
        </div>
      )}
    </div>
  )
}