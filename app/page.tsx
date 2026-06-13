'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const apiUrl = '/api/admin'

type CartItem = {
  product: any
  size: string
  quantity: number
}

const styles = {
  zebraStripe: {
    height: 4,
    background: 'repeating-linear-gradient(90deg, #000 0px, #000 20px, #fff 20px, #fff 40px)',
    width: '100%',
  },
}

const BLUR_PLACEHOLDER = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwkHBgoJCAkLCwoMDxkQDw4ODx4WFxIZJCAmJSMgIyIoLTkwKCo2KyIjMkQyNjs9QEBAJjBGS0U+Sjk/QD3/2wBDAQsLCw8NDx0QEB09KSMpPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT3/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAX4P/2Q=='

export default function Home() {
  const [newProducts, setNewProducts] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [saleProducts, setSaleProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [modalVideo, setModalVideo] = useState<string | null>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedSizes, setSelectedSizes] = useState<{ [key: number]: string }>({})
  const [toast, setToast] = useState<string | null>(null)

  const [orderName, setOrderName] = useState('')
  const [orderPhone, setOrderPhone] = useState('')
  const [orderComment, setOrderComment] = useState('')
  const [orderSent, setOrderSent] = useState(false)
  const [orderSending, setOrderSending] = useState(false)

  useEffect(() => {
    loadNewProducts()
    loadAllProducts()
    loadSaleProducts()
    loadCategories()
    const saved = localStorage.getItem('zebra_cart')
    if (saved) setCart(JSON.parse(saved))
  }, [])

  useEffect(() => { localStorage.setItem('zebra_cart', JSON.stringify(cart)) }, [cart])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  const loadNewProducts = async () => {
    const res = await fetch(`${apiUrl}/products`)
    const json = await res.json()
    const tenDaysAgo = new Date(); tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    const news = (json.data || []).filter((p: any) => p.is_active && new Date(p.created_at) >= tenDaysAgo)
    await enrichProducts(news); setNewProducts(news)
  }

  const loadAllProducts = async () => {
    const res = await fetch(`${apiUrl}/products`)
    const json = await res.json()
    const active = (json.data || []).filter((p: any) => p.is_active)
    await enrichProducts(active); setAllProducts(active)
  }

  const loadSaleProducts = async () => {
    const res = await fetch(`${apiUrl}/products`)
    const json = await res.json()
    const sale = (json.data || []).filter((p: any) => p.is_active && p.old_price)
    await enrichProducts(sale); setSaleProducts(sale)
  }

  const loadCategories = async () => {
    const res = await fetch(`${apiUrl}/categories`)
    const json = await res.json(); setCategories(json.data || [])
  }

  const enrichProducts = async (products: any[]) => {
    if (products.length === 0) return
    const ids = products.map((p: any) => p.id).join(',')
    const imgRes = await fetch(`${apiUrl}/product-first-image?ids=${ids}`); const imgJson = await imgRes.json()
    const images = imgJson.data || {}
    const catRes = await fetch(`${apiUrl}/categories`); const catJson = await catRes.json()
    const catMap: any = {}; (catJson.data || []).forEach((c: any) => { catMap[c.id] = c.name })
    const vidPromises = products.map((p: any) => fetch(`${apiUrl}/product-videos?product_id=${p.id}`).then(r => r.json()))
    const sizePromises = products.map((p: any) => fetch(`${apiUrl}/product-sizes?product_id=${p.id}`).then(r => r.json()))
    const vidResults = await Promise.all(vidPromises); const sizeResults = await Promise.all(sizePromises)
    for (let i = 0; i < products.length; i++) {
      products[i].thumbnail = images[products[i].id] || null
      products[i].category_name = catMap[products[i].category_id] || ''
      products[i].videos = vidResults[i]?.data || []
      products[i].sizes = sizeResults[i]?.data || []
    }
  }

  const filteredProducts = allProducts.filter((p: any) => {
    const matchCat = !selectedCategory || p.category_id === parseInt(selectedCategory)
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCat && matchSearch
  })

  const openImage = (url: string) => setModalImage(url)
  const openVideo = (url: string) => setModalVideo(url)
  const closeModal = () => { setModalImage(null); setModalVideo(null) }

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) return `https://www.youtube.com/embed/${url.split('v=')[1]?.split('&')[0]}`
    if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1]?.split('?')[0]}`
    return url
  }

  const addToCart = (product: any, size: string) => {
    if (!size) { alert('Оберіть розмір'); return }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.size === size)
      if (existing) return prev.map(item => item.product.id === product.id && item.size === size ? { ...item, quantity: item.quantity + 1 } : item)
      return [...prev, { product, size, quantity: 1 }]
    })
    showToast('✅ Додано в кошик!')
  }

  const removeFromCart = (id: number, size: string) => setCart(prev => prev.filter(i => !(i.product.id === id && i.size === size)))
  const updateQuantity = (id: number, size: string, qty: number) => {
    if (qty <= 0) { removeFromCart(id, size); return }
    setCart(prev => prev.map(i => i.product.id === id && i.size === size ? { ...i, quantity: qty } : i))
  }
  const totalPrice = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  const submitOrder = async () => {
    if (!orderName || !orderPhone) { alert('Заповніть ім\'я та телефон'); return }
    if (cart.length === 0) { alert('Кошик порожній'); return }
    setOrderSending(true)
    const items = cart.map(i => ({ product_id: i.product.id, name: i.product.name, size: i.size, price: i.product.price, quantity: i.quantity }))
    await fetch(`${apiUrl}/orders`, { method: 'POST', body: JSON.stringify({ customer_name: orderName, customer_phone: orderPhone, comment: orderComment, items }), headers: { 'Content-Type': 'application/json' } })
    setOrderSent(true); setCart([]); setOrderName(''); setOrderPhone(''); setOrderComment(''); setOrderSending(false)
  }

  const sectionTitle = (color = '#000') => ({
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
    color,
    marginBottom: 8,
  })

  const sectionSubtitle = {
    fontSize: 12,
    color: '#950606',
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    marginBottom: 40,
  }

  return (
    <div style={{ fontFamily: "'Inter', 'Arial', sans-serif", background: '#fff', color: '#111' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#000', color: '#fff', padding: '14px 28px', zIndex: 2000, fontWeight: 700, letterSpacing: 1, fontSize: 13, textTransform: 'uppercase' }}>{toast}</div>
      )}

      {/* ШАПКА */}
      <header style={{ background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={styles.zebraStripe} />
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '12px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Image src="/zebra logo.png" alt="ZEBRA" width={36} height={36} style={{ objectFit: 'contain' }} />
              <div>
                <span className="header-title" style={{ fontSize: 20, fontWeight: 900, letterSpacing: 5 }}>ZEBRA</span>
                <span style={{ fontSize: 9, color: '#aaa', display: 'block', letterSpacing: 3 }}>STYLE</span>
              </div>
            </div>
          </div>

          <div className="header-nav" style={{
            display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
            borderTop: '1px solid #eee', paddingTop: 8, fontSize: 10,
          }}>
                        {[
              { label: 'ПРО НАС', target: 'about' },
              { label: 'НОВИНКИ', target: 'new' },
              { label: 'КАТАЛОГ', target: 'catalog' },
              { label: 'РОЗПРОДАЖ', target: 'sale' },
              { label: 'КОНТАКТИ', target: 'contacts' },
            ].map(link => (
              <button key={link.target} onClick={() => { const el = document.getElementById(link.target); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: '2px solid #000',
                  padding: '6px 12px 4px 12px',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: '#333',
                  textTransform: 'uppercase',
                }}>
                {link.label}
              </button>
            ))}

            <div style={{ width: 1, height: 14, background: '#ddd', margin: '0 4px' }} />

            <span className="hide-mobile" style={{ color: '#666', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>🆕 НОВІ ТОВАРИ ЩОТИЖНЯ</span>
            <span className="hide-mobile" style={{ color: '#666', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>📞 КОНСУЛЬТАЦІЇ WHATSAPP</span>
            <span className="hide-mobile" style={{ color: '#666', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>📦 ДОСТАВКА НОВА ПОШТА</span>

            <button onClick={() => setCartOpen(!cartOpen)} style={{ padding: '8px 14px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6, borderRadius: 2 }}>
              🛒 {cart.length > 0 && <span style={{ background: '#fff', color: '#000', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{cart.length}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ПРО НАС */}
      <section id="about" style={{
        padding: '40px 20px',
        borderBottom: '1px solid #eee',
        background: 'url("/empty-town-square.jpg") center/cover no-repeat',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)' }} />
        <div className="about-container" style={{
          maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1,
          display: 'flex', gap: 24, alignItems: 'center',
        }}>
          <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: 200 }}>
            <Image src="/zebra logo.png" alt="ZEBRA" width={300} height={300} style={{ objectFit: 'contain' }} />
            <p style={{ fontSize: 14, color: '#555', fontStyle: 'italic', marginTop: 8, maxWidth: 250 }}>Одяг у стилі сучасного міста</p>
          </div>

          <div className="trend-row" style={{ flex: 1, display: 'flex', gap: 12, alignItems: 'stretch', minHeight: 350 }}>
            {['trend 2026.jpg', 'trend office 2026.jpg', 'trend we 2026.jpg'].map((img, idx) => (
              <div key={idx} style={{
                flex: 1,
                background: `url("/${img}") center/contain no-repeat`,
                borderRadius: 4,
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', borderRadius: 4 }} />
                <div style={{
                  position: 'relative', zIndex: 1,
                  padding: '8px 16px', margin: 12,
                  background: 'rgba(141, 13, 13, 0.6)', borderRadius: 2,
                  color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 2,
                }}>
                  {['ТРЕНДИ 2026', 'ОФІС', 'WEEKEND'][idx]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={styles.zebraStripe} />

      {/* НОВИНКИ */}
      <section id="new" style={{ padding: '50px 20px', background: 'url("/zebra fon.jpeg") center/cover no-repeat', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)' }} />
        <div style={{ maxWidth: 1300, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div className="section-title" style={sectionTitle()}>НОВИНКИ</div>
            <div className="section-subtitle" style={sectionSubtitle}>Останні надходження</div>
          </div>
          {newProducts.length > 0 ? (
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {newProducts.map(p => <ProductCard key={p.id} product={p} onImageClick={openImage} onVideoClick={openVideo} selectedSize={selectedSizes[p.id] || ''} onSizeChange={(s: string) => setSelectedSizes(prev => ({ ...prev, [p.id]: s }))} onAddToCart={(s: string) => addToCart(p, s)} />)}
            </div>
          ) : <p style={{ textAlign: 'center', color: '#999' }}>Новинки скоро з'являться</p>}
        </div>
      </section>

      <div style={styles.zebraStripe} />

      {/* КАТАЛОГ */}
      <section id="catalog" style={{ padding: '50px 20px', background: 'url("/fon leto.jpg") center/cover no-repeat', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ maxWidth: 1300, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div className="section-title" style={sectionTitle()}>КАТАЛОГ</div>
            <div className="section-subtitle" style={sectionSubtitle}>Обирайте свій стиль</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <input type="text" placeholder="🔍 ПОШУК..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '10px 14px', border: '2px solid #000', fontSize: 11, letterSpacing: 1, flex: 1, minWidth: 150, maxWidth: 300, background: '#fff' }} />
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              style={{ padding: '10px 14px', border: '2px solid #000', fontSize: 11, letterSpacing: 1, background: '#fff', cursor: 'pointer' }}>
              <option value="">ВСІ</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {filteredProducts.map(p => <ProductCard key={p.id} product={p} onImageClick={openImage} onVideoClick={openVideo} selectedSize={selectedSizes[p.id] || ''} onSizeChange={(s: string) => setSelectedSizes(prev => ({ ...prev, [p.id]: s }))} onAddToCart={(s: string) => addToCart(p, s)} />)}
          </div>
        </div>
      </section>

      <div style={styles.zebraStripe} />

      {/* РОЗПРОДАЖ */}
      {saleProducts.length > 0 && (
        <section id="sale" style={{ padding: '50px 20px', background: 'url("/fon leto.jpg") center/cover no-repeat', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.3)' }} />
          <div style={{ maxWidth: 1300, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div className="section-title" style={sectionTitle('#cc0000')}>РОЗПРОДАЖ</div>
              <div className="section-subtitle" style={{ ...sectionSubtitle, color: '#cc0000' }}>Знижки до -50%</div>
            </div>
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {saleProducts.map(p => <ProductCard key={p.id} product={p} onImageClick={openImage} onVideoClick={openVideo} selectedSize={selectedSizes[p.id] || ''} onSizeChange={(s: string) => setSelectedSizes(prev => ({ ...prev, [p.id]: s }))} onAddToCart={(s: string) => addToCart(p, s)} />)}
            </div>
          </div>
        </section>
      )}

                 {/* КОНТАКТИ */}
      <footer id="contacts" style={{ background: '#000', color: '#fff', padding: '10px 10px' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', gap: 30, alignItems: 'center', flexWrap: 'wrap',
        }}>
          {/* Логотип + Назва + Адреса */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '0 0 auto' }}>
            <Image src="/zebra logo fon.jpg" alt="ZEBRA" width={80} height={80} style={{ objectFit: 'contain', filter: 'brightness(1)' }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 3, marginBottom: 2 }}>магазин ZEBRA</div>
              <div style={{ color: '#aaa', fontSize: 11, letterSpacing: 1 }}>УКРАЇНА, ОДЕСА</div>
              <div style={{ color: '#aaa', fontSize: 11, letterSpacing: 1 }}>Північний ринок</div>
            </div>
          </div>

          {/* Карта Google */}
          <div style={{ flex: 1, minWidth: 250, minHeight: 120, borderRadius: 4, overflow: 'hidden' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m10!1m8!1m3!1d996.0696065052813!2d30.794281646438897!3d46.58705469680438!3m2!1i1024!2i768!4f13.1!5e1!3m2!1suk!2sge!4v1781028470604!5m2!1suk!2sge"
              width="100%"
              height="120"
              style={{ border: 0, borderRadius: 4 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="ZEBRA location"
            />
          </div>

          {/* Соцмережі */}
          <div style={{
            flex: '0 0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 20px',
            fontSize: 12,
            letterSpacing: 1,
          }}>
            <a href="https://www.tiktok.com/@zebravogue?is_from_webapp=1&sender_device=pc" target="_blank" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              TikTok
            </a>
            <a href="https://www.instagram.com/zebravogue?igsh=MWk3aHEyaHAxcjVycQ==" target="_blank" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              Instagram
            </a>
            <a href="https://facebook.com/zebra_shop" target="_blank" style={{ color: '#aaa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              Facebook
            </a>
            <a href="https://t.me/+gGsV6MQWCJMyYTRi" target="_blank" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              Telegram
            </a>
            <a href="https://wa.me/380XXXXXXXXX" target="_blank" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, gridColumn: '1 / -1' }}>
               WhatsApp
            </a>
          </div>
        </div>
      </footer>

      {/* МОДАЛЬНЕ ВІКНО */}
      {(modalImage || modalVideo) && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'pointer' }}>
          <div className="modal-content" style={{ maxWidth: '90vw', maxHeight: '90vh', cursor: 'default' }} onClick={e => e.stopPropagation()}>
            {modalImage && <img src={modalImage} alt="" style={{ maxWidth: '100%', maxHeight: '85vh' }} />}
            {modalVideo && <iframe src={getEmbedUrl(modalVideo)} style={{ width: '90vw', height: '50vw', maxWidth: 800, maxHeight: 450 }} allowFullScreen />}
            <button onClick={closeModal} style={{ position: 'absolute', top: 12, right: 20, background: '#fff', color: '#000', border: 'none', width: 28, height: 28, fontSize: 14, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        </div>
      )}

      {/* КОШИК */}
      {cartOpen && (
        <div className="cart-panel" style={{ position: 'fixed', top: 0, right: 0, width: 380, maxWidth: '100vw', height: '100vh', background: '#fff', zIndex: 999, boxShadow: '-4px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 15, fontWeight: 900, letterSpacing: 2, margin: 0 }}>КОШИК</h2>
            <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#999' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
            {cart.length === 0 ? <p style={{ color: '#999', textAlign: 'center', marginTop: 40, fontSize: 12 }}>Кошик порожній</p> : cart.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: 50, height: 65, background: '#f5f5f5', flexShrink: 0, position: 'relative' }}>
                  {item.product.thumbnail ? (
                    <Image src={item.product.thumbnail} alt="" fill style={{ objectFit: 'cover' }} sizes="50px" />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc', fontSize: 16 }}>Z</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 11 }}>{item.product.name}</div>
                  <div style={{ color: '#999', fontSize: 9, letterSpacing: 1, marginTop: 2 }}>РОЗМІР: {item.size}</div>
                  <div style={{ fontWeight: 900, marginTop: 4, fontSize: 12 }}>{item.product.price} ГРН</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <button onClick={() => updateQuantity(item.product.id, item.size, item.quantity - 1)} style={{ width: 22, height: 22, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 11 }}>−</button>
                    <span style={{ fontSize: 11 }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.size, item.quantity + 1)} style={{ width: 22, height: 22, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 11 }}>+</button>
                    <button onClick={() => removeFromCart(item.product.id, item.size)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div style={{ padding: 16, borderTop: '1px solid #eee', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 13, fontWeight: 900, letterSpacing: 1 }}>
                <span>РАЗОМ:</span><span>{totalPrice} ГРН</span>
              </div>
              {!orderSent ? (
                <>
                  <input type="text" placeholder="ІМ'Я" value={orderName} onChange={e => setOrderName(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #ddd', marginBottom: 6, fontSize: 10, letterSpacing: 1, boxSizing: 'border-box' }} />
                  <input type="tel" placeholder="ТЕЛЕФОН" value={orderPhone} onChange={e => setOrderPhone(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #ddd', marginBottom: 6, fontSize: 10, letterSpacing: 1, boxSizing: 'border-box' }} />
                  <textarea placeholder="КОМЕНТАР" value={orderComment} onChange={e => setOrderComment(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #ddd', marginBottom: 12, fontSize: 10, letterSpacing: 1, minHeight: 35, resize: 'vertical', boxSizing: 'border-box' }} />
                  <button onClick={submitOrder} disabled={orderSending} style={{ width: '100%', padding: 11, background: '#000', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>
                    {orderSending ? '...' : 'ОФОРМИТИ ЗАМОВЛЕННЯ'}
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 14 }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                  <div style={{ fontWeight: 700, letterSpacing: 1, fontSize: 12 }}>ДЯКУЄМО!</div>
                  <div style={{ color: '#999', fontSize: 10, marginTop: 4 }}>Ми зв'яжемося з вами</div>
                  <button onClick={() => { setCartOpen(false); setOrderSent(false) }} style={{ marginTop: 12, padding: '8px 16px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 9, letterSpacing: 1 }}>ЗАКРИТИ</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// КАРТКА ТОВАРУ
function ProductCard({ product, onImageClick, onVideoClick, selectedSize, onSizeChange, onAddToCart }: {
  product: any
  onImageClick: (url: string) => void
  onVideoClick: (url: string) => void
  selectedSize: string
  onSizeChange: (size: string) => void
  onAddToCart: (size: string) => void
}) {
  const hasVideo = product.videos?.length > 0
  const hasSizes = product.sizes?.length > 0
  const isSale = !!product.old_price

  return (
    <div className="product-card" style={{ background: '#fff', border: '1px solid #eee', position: 'relative', transition: 'box-shadow 0.3s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {isSale && (
        <div style={{ position: 'absolute', top: 0, left: 0, background: '#cc0000', color: '#fff', padding: '3px 8px', fontSize: 9, fontWeight: 700, letterSpacing: 1, zIndex: 2 }}>
          -{Math.round((1 - product.price / product.old_price) * 100)}%
        </div>
      )}

      <div
        onClick={() => product.thumbnail ? onImageClick(product.thumbnail) : hasVideo ? onVideoClick(product.videos[0].video_url) : null}
        style={{ aspectRatio: '3/4', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
      >
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name || ''}
            fill
            sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"
            style={{ objectFit: 'cover', transition: 'transform 0.4s' }}
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            loading="lazy"
          />
        ) : hasVideo ? (
          <div style={{ textAlign: 'center', color: '#999' }}><div style={{ fontSize: 28 }}>▶</div></div>
        ) : (
          <Image src="/zebra logo.png" alt="" width={40} height={40} style={{ opacity: 0.12 }} />
        )}
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 8, color: '#999', letterSpacing: 1.5, marginBottom: 2 }}>{product.category_name?.toUpperCase() || '—'}</div>
        <div className="product-card-name" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{product.name}</div>
        <div style={{ marginBottom: 8 }}>
          <span className="product-card-price" style={{ fontSize: 14, fontWeight: 900, color: isSale ? '#cc0000' : '#000' }}>{product.price} ГРН</span>
          {product.old_price && <span style={{ fontSize: 10, color: '#999', textDecoration: 'line-through', marginLeft: 5 }}>{product.old_price} ГРН</span>}
        </div>

        {hasSizes && (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
            {product.sizes.filter((s: any) => s.stock > 0).slice(0, 4).map((s: any) => (
              <button key={s.id} onClick={() => onSizeChange(s.size)}
                style={{ padding: '3px 7px', border: selectedSize === s.size ? '2px solid #000' : '1px solid #ddd', background: selectedSize === s.size ? '#000' : '#fff', color: selectedSize === s.size ? '#fff' : '#000', cursor: 'pointer', fontSize: 9, letterSpacing: 1 }}>
                {s.size}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 3 }}>
          <button onClick={() => window.location.href = `/product/${product.id}`}
            style={{ flex: 1, padding: '7px 0', background: '#fff', color: '#000', border: '2px solid #000', cursor: 'pointer', fontSize: 8, fontWeight: 700, letterSpacing: 1.5 }}>
            ДЕТАЛЬНІШЕ
          </button>
          <button onClick={() => onAddToCart(selectedSize)} disabled={hasSizes && !selectedSize}
            style={{ flex: 2, padding: '7px 0', background: hasSizes && !selectedSize ? '#ccc' : isSale ? '#cc0000' : '#000', color: '#fff', border: 'none', cursor: hasSizes && !selectedSize ? 'not-allowed' : 'pointer', fontSize: 8, fontWeight: 700, letterSpacing: 1.5 }}>
            {hasSizes && !selectedSize ? 'РОЗМІР' : '🛒 КУПИТИ'}
          </button>
        </div>
      </div>
    </div>
  )
}