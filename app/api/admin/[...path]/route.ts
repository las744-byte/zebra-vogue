import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const resource = path[0]
  const id = path[1]
  const url = request.nextUrl
  const search = url.searchParams.get('q') || ''
  const categoryId = url.searchParams.get('category_id') || ''
  const article = url.searchParams.get('article') || ''
  const sale = url.searchParams.get('sale') || ''
  const sortOrder = url.searchParams.get('sort') || 'desc'

  if (resource === 'products') {
    if (id) {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    } else {
      let query = supabase.from('products').select('*', { count: 'exact' })

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }
      if (article) {
        query = query.ilike('article', `%${article}%`)
      }
      if (categoryId) {
        query = query.eq('category_id', parseInt(categoryId))
      }
      if (sale === 'true') {
        query = query.not('old_price', 'is', null).gt('old_price', 0)
      }

      const { data, error, count } = await query.order('created_at', { ascending: sortOrder === 'asc' })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const response = NextResponse.json({ data, total: count })
      response.headers.set('Content-Range', `products 0-${(data || []).length}/${count}`)
      response.headers.set('Access-Control-Expose-Headers', 'Content-Range')
      return response
    }
  }

  if (resource === 'categories') {
    const { data, error } = await supabase.from('categories').select('*').order('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, total: (data || []).length })
  }

  if (resource === 'product-images') {
    const productId = request.nextUrl.searchParams.get('product_id')
    if (!productId) return NextResponse.json({ data: [], total: 0 })
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [], total: (data || []).length })
  }

  if (resource === 'product-first-image') {
    const productIds = url.searchParams.get('ids') || ''
    if (!productIds) return NextResponse.json({ data: {}, total: 0 })
    const ids = productIds.split(',').map(Number)
    const { data, error } = await supabase
      .from('product_images')
      .select('product_id, image_url')
      .in('product_id', ids)
      .order('sort_order')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result: Record<number, string> = {}
    for (const row of data || []) {
      if (!result[row.product_id]) {
        result[row.product_id] = row.image_url
      }
    }
    return NextResponse.json({ data: result, total: Object.keys(result).length })
  }

  if (resource === 'product-sizes') {
    const productId = request.nextUrl.searchParams.get('product_id')
    if (!productId) return NextResponse.json({ data: [], total: 0 })
    const { data, error } = await supabase
      .from('product_sizes')
      .select('*')
      .eq('product_id', productId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [], total: (data || []).length })
  }

  if (resource === 'product-videos') {
    const productId = request.nextUrl.searchParams.get('product_id')
    if (!productId) return NextResponse.json({ data: [], total: 0 })
    const { data, error } = await supabase
      .from('product_videos')
      .select('*')
      .eq('product_id', productId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [], total: (data || []).length })
  }

  if (resource === 'orders') {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, total: (data || []).length })
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const resource = path[0]
  const body = await request.json()

  if (resource === 'products') {
    const { data, error } = await supabase.from('products').insert(body).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data[0] })
  }

  if (resource === 'product-images') {
    const { data, error } = await supabase.from('product_images').insert(body).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data[0] })
  }

  if (resource === 'product-sizes') {
    const { data, error } = await supabase.from('product_sizes').insert(body).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data[0] })
  }

  if (resource === 'product-videos') {
    const { data, error } = await supabase.from('product_videos').insert(body).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data[0] })
  }

  if (resource === 'orders') {
    const { data, error } = await supabase.from('orders').insert(body).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data[0] })
  }

  if (resource === 'upload') {
    const { fileName, fileBase64 } = body
    try {
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
      const filePath = `${Date.now()}-${nameWithoutExt}.webp`

      const buffer = Buffer.from(fileBase64, 'base64')

      const { data, error } = await supabase.storage
        .from('product-photos')
        .upload(filePath, buffer, {
          contentType: 'image/webp',
          upsert: false,
        })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const { data: publicUrl } = supabase.storage
        .from('product-photos')
        .getPublicUrl(filePath)

      return NextResponse.json({ data: { url: publicUrl.publicUrl } })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const resource = path[0]
  const id = path[1]
  const body = await request.json()

  if (resource === 'products') {
    const { data, error } = await supabase.from('products').update(body).eq('id', id).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data[0] })
  }

  if (resource === 'product-sizes') {
    const { data, error } = await supabase.from('product_sizes').update(body).eq('id', id).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data[0] })
  }

  if (resource === 'product-videos') {
    const { data, error } = await supabase.from('product_videos').update(body).eq('id', id).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data[0] })
  }

  if (resource === 'orders') {
    const { data, error } = await supabase.from('orders').update(body).eq('id', id).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data[0] })
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const resource = path[0]
  const id = path[1]

  if (resource === 'products') {
    const { data: images } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', id)

    if (images && images.length > 0) {
      const paths = images
        .map((img: any) => {
          const match = img.image_url.match(/\/product-photos\/(.+)$/)
          return match ? match[1] : null
        })
        .filter(Boolean)

      if (paths.length > 0) {
        await supabase.storage.from('product-photos').remove(paths)
      }
    }

    await supabase.from('product_images').delete().eq('product_id', id)
    await supabase.from('product_sizes').delete().eq('product_id', id)
    await supabase.from('product_videos').delete().eq('product_id', id)

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { id } })
  }

  if (resource === 'product-images') {
    const { data: image } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('id', id)
      .single()

    if (image) {
      const match = image.image_url.match(/\/product-photos\/(.+)$/)
      if (match) {
        await supabase.storage.from('product-photos').remove([match[1]])
      }
    }

    const { error } = await supabase.from('product_images').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { id } })
  }

  if (resource === 'product-sizes') {
    const { error } = await supabase.from('product_sizes').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { id } })
  }

  if (resource === 'product-videos') {
    const { error } = await supabase.from('product_videos').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { id } })
  }

  if (resource === 'orders') {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { id } })
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}