(function(nacl) {
  'use strict';
  
  // Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
  // Public domain.
  //
  // Implementation derived from TweetNaCl version 20140427.
  // See for details: http://tweetnacl.cr.yp.to/
  
  var u64 = function(h, l) { this.hi = h|0 >>> 0; this.lo = l|0 >>> 0; };
  var gf = function(init) {
    var i, r = new Float64Array(16);
    if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
    return r;
  };
  
  //  Pluggable, initialized in high-level API below.
  var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };
  
  var _0 = new Uint8Array(16);
  var _9 = new Uint8Array(32); _9[0] = 9;
  
  var gf0 = gf(),
      gf1 = gf([1]),
      _121665 = gf([0xdb41, 1]),
      D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
      D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
      X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
      Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
      I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);
  
  function L32(x, c) { return (x << c) | (x >>> (32 - c)); }
  
  function ld32(x, i) {
    var u = x[i+3] & 0xff;
    u = (u<<8)|(x[i+2] & 0xff);
    u = (u<<8)|(x[i+1] & 0xff);
    return (u<<8)|(x[i+0] & 0xff);
  }
  
  function dl64(x, i) {
    var h = (x[i] << 24) | (x[i+1] << 16) | (x[i+2] << 8) | x[i+3];
    var l = (x[i+4] << 24) | (x[i+5] << 16) | (x[i+6] << 8) | x[i+7];
    return new u64(h, l);
  }
  
  function st32(x, j, u) {
    var i;
    for (i = 0; i < 4; i++) { x[j+i] = u & 255; u >>>= 8; }
  }
  
  function ts64(x, i, u) {
    x[i]   = (u.hi >> 24) & 0xff;
    x[i+1] = (u.hi >> 16) & 0xff;
    x[i+2] = (u.hi >>  8) & 0xff;
    x[i+3] = u.hi & 0xff;
    x[i+4] = (u.lo >> 24)  & 0xff;
    x[i+5] = (u.lo >> 16)  & 0xff;
    x[i+6] = (u.lo >>  8)  & 0xff;
    x[i+7] = u.lo & 0xff;
  }
  
  function vn(x, xi, y, yi, n) {
    var i,d = 0;
    for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
    return (1 & ((d - 1) >>> 8)) - 1;
  }
  
  function crypto_verify_16(x, xi, y, yi) {
    return vn(x,xi,y,yi,16);
  }
  
  function crypto_verify_32(x, xi, y, yi) {
    return vn(x,xi,y,yi,32);
  }
  
  function core(out,inp,k,c,h) {
    var w = new Uint32Array(16), x = new Uint32Array(16),
        y = new Uint32Array(16), t = new Uint32Array(4);
    var i, j, m;
  
    for (i = 0; i < 4; i++) {
      x[5*i] = ld32(c, 4*i);
      x[1+i] = ld32(k, 4*i);
      x[6+i] = ld32(inp, 4*i);
      x[11+i] = ld32(k, 16+4*i);
    }
  
    for (i = 0; i < 16; i++) y[i] = x[i];
  
    for (i = 0; i < 20; i++) {
      for (j = 0; j < 4; j++) {
        for (m = 0; m < 4; m++) t[m] = x[(5*j+4*m)%16];
        t[1] ^= L32((t[0]+t[3])|0, 7);
        t[2] ^= L32((t[1]+t[0])|0, 9);
        t[3] ^= L32((t[2]+t[1])|0,13);
        t[0] ^= L32((t[3]+t[2])|0,18);
        for (m = 0; m < 4; m++) w[4*j+(j+m)%4] = t[m];
      }
      for (m = 0; m < 16; m++) x[m] = w[m];
    }
  
    if (h) {
      for (i = 0; i < 16; i++) x[i] = (x[i] + y[i]) | 0;
      for (i = 0; i < 4; i++) {
        x[5*i] = (x[5*i] - ld32(c, 4*i)) | 0;
        x[6+i] = (x[6+i] - ld32(inp, 4*i)) | 0;
      }
      for (i = 0; i < 4; i++) {
        st32(out,4*i,x[5*i]);
        st32(out,16+4*i,x[6+i]);
      }
    } else {
      for (i = 0; i < 16; i++) st32(out, 4 * i, (x[i] + y[i]) | 0);
    }
  }
  
  function crypto_core_salsa20(out,inp,k,c) {
    core(out,inp,k,c,false);
    return 0;
  }
  
  function crypto_core_hsalsa20(out,inp,k,c) {
    core(out,inp,k,c,true);
    return 0;
  }
  
  var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
              // "expand 32-byte k"
  
  function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
    var z = new Uint8Array(16), x = new Uint8Array(64);
    var u, i;
    if (!b) return 0;
    for (i = 0; i < 16; i++) z[i] = 0;
    for (i = 0; i < 8; i++) z[i] = n[i];
    while (b >= 64) {
      crypto_core_salsa20(x,z,k,sigma);
      for (i = 0; i < 64; i++) c[cpos+i] = (m?m[mpos+i]:0) ^ x[i];
      u = 1;
      for (i = 8; i < 16; i++) {
        u = u + (z[i] & 0xff) | 0;
        z[i] = u & 0xff;
        u >>>= 8;
      }
      b -= 64;
      cpos += 64;
      if (m) mpos += 64;
    }
    if (b > 0) {
      crypto_core_salsa20(x,z,k,sigma);
      for (i = 0; i < b; i++) c[cpos+i] = (m?m[mpos+i]:0) ^ x[i];
    }
    return 0;
  }
  
  function crypto_stream_salsa20(c,cpos,d,n,k) {
    return crypto_stream_salsa20_xor(c,cpos,null,0,d,n,k);
  }
  
  function crypto_stream(c,cpos,d,n,k) {
    var s = new Uint8Array(32);
    crypto_core_hsalsa20(s,n,k,sigma);
    return crypto_stream_salsa20(c,cpos,d,n.subarray(16),s);
  }
  
  function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
    var s = new Uint8Array(32);
    crypto_core_hsalsa20(s,n,k,sigma);
    return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,n.subarray(16),s);
  }
  
  function add1305(h, c) {
    var j, u = 0;
    for (j = 0; j < 17; j++) {
      u = (u + ((h[j] + c[j]) | 0)) | 0;
      h[j] = u & 255;
      u >>>= 8;
    }
  }
  
  var minusp = new Uint32Array([
    5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 252
  ]);
  
  function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
    var s, i, j, u;
    var x = new Uint32Array(17), r = new Uint32Array(17),
        h = new Uint32Array(17), c = new Uint32Array(17),
        g = new Uint32Array(17);
    for (j = 0; j < 17; j++) r[j]=h[j]=0;
    for (j = 0; j < 16; j++) r[j]=k[j];
    r[3]&=15;
    r[4]&=252;
    r[7]&=15;
    r[8]&=252;
    r[11]&=15;
    r[12]&=252;
    r[15]&=15;
  
    while (n > 0) {
      for (j = 0; j < 17; j++) c[j] = 0;
      for (j = 0; (j < 16) && (j < n); ++j) c[j] = m[mpos+j];
      c[j] = 1;
      mpos += j; n -= j;
      add1305(h,c);
      for (i = 0; i < 17; i++) {
        x[i] = 0;
        for (j = 0; j < 17; j++) x[i] = (x[i] + (h[j] * ((j <= i) ? r[i - j] : ((320 * r[i + 17 - j])|0))) | 0) | 0;
      }
      for (i = 0; i < 17; i++) h[i] = x[i];
      u = 0;
      for (j = 0; j < 16; j++) {
        u = (u + h[j]) | 0;
        h[j] = u & 255;
        u >>>= 8;
      }
      u = (u + h[16]) | 0; h[16] = u & 3;
      u = (5 * (u >>> 2)) | 0;
      for (j = 0; j < 16; j++) {
        u = (u + h[j]) | 0;
        h[j] = u & 255;
        u >>>= 8;
      }
      u = (u + h[16]) | 0; h[16] = u;
    }
  
    for (j = 0; j < 17; j++) g[j] = h[j];
    add1305(h,minusp);
    s = (-(h[16] >>> 7) | 0);
    for (j = 0; j < 17; j++) h[j] ^= s & (g[j] ^ h[j]);
  
    for (j = 0; j < 16; j++) c[j] = k[j + 16];
    c[16] = 0;
    add1305(h,c);
    for (j = 0; j < 16; j++) out[outpos+j] = h[j];
    return 0;
  }
  
  function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
    var x = new Uint8Array(16);
    crypto_onetimeauth(x,0,m,mpos,n,k);
    return crypto_verify_16(h,hpos,x,0);
  }
  
  function crypto_secretbox(c,m,d,n,k) {
    var i;
    if (d < 32) return -1;
    crypto_stream_xor(c,0,m,0,d,n,k);
    crypto_onetimeauth(c, 16, c, 32, d - 32, c);
    for (i = 0; i < 16; i++) c[i] = 0;
    return 0;
  }
  
  function crypto_secretbox_open(m,c,d,n,k) {
    var i;
    var x = new Uint8Array(32);
    if (d < 32) return -1;
    crypto_stream(x,0,32,n,k);
    if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
    crypto_stream_xor(m,0,c,0,d,n,k);
    for (i = 0; i < 32; i++) m[i] = 0;
    return 0;
  }
  
  function set25519(r, a) {
    var i;
    for (i = 0; i < 16; i++) r[i] = a[i]|0;
  }
  
  function car25519(o) {
    var c;
    var i;
    for (i = 0; i < 16; i++) {
        o[i] += 65536;
        c = Math.floor(o[i] / 65536);
        o[(i+1)*(i<15?1:0)] += c - 1 + 37 * (c-1) * (i===15?1:0);
        o[i] -= (c * 65536);
    }
  }
  
  function sel25519(p, q, b) {
    var t, c = ~(b-1);
    for (var i = 0; i < 16; i++) {
      t = c & (p[i] ^ q[i]);
      p[i] ^= t;
      q[i] ^= t;
    }
  }
  
  function pack25519(o, n) {
    var i, j, b;
    var m = gf(), t = gf();
    for (i = 0; i < 16; i++) t[i] = n[i];
    car25519(t);
    car25519(t);
    car25519(t);
    for (j = 0; j < 2; j++) {
      m[0] = t[0] - 0xffed;
      for (i = 1; i < 15; i++) {
        m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
        m[i-1] &= 0xffff;
      }
      m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
      b = (m[15]>>16) & 1;
      m[14] &= 0xffff;
      sel25519(t, m, 1-b);
    }
    for (i = 0; i < 16; i++) {
      o[2*i] = t[i] & 0xff;
      o[2*i+1] = t[i]>>8;
    }
  }
  
  function neq25519(a, b) {
    var c = new Uint8Array(32), d = new Uint8Array(32);
    pack25519(c, a);
    pack25519(d, b);
    return crypto_verify_32(c, 0, d, 0);
  }
  
  function par25519(a) {
    var d = new Uint8Array(32);
    pack25519(d, a);
    return d[0] & 1;
  }
  
  function unpack25519(o, n) {
    var i;
    for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
    o[15] &= 0x7fff;
  }
  
  function A(o, a, b) {
    var i;
    for (i = 0; i < 16; i++) o[i] = (a[i] + b[i])|0;
  }
  
  function Z(o, a, b) {
    var i;
    for (i = 0; i < 16; i++) o[i] = (a[i] - b[i])|0;
  }
  
  function M(o, a, b) {
    var i, j, t = new Float64Array(31);
    for (i = 0; i < 31; i++) t[i] = 0;
    for (i = 0; i < 16; i++) {
      for (j = 0; j < 16; j++) {
        t[i+j] += a[i] * b[j];
      }
    }
    for (i = 0; i < 15; i++) {
      t[i] += 38 * t[i+16];
    }
    for (i = 0; i < 16; i++) o[i] = t[i];
    car25519(o);
    car25519(o);
  }
  
  function S(o, a) {
    M(o, a, a);
  }
  
  function inv25519(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++) c[a] = i[a];
    for (a = 253; a >= 0; a--) {
      S(c, c);
      if(a !== 2 && a !== 4) M(c, c, i);
    }
    for (a = 0; a < 16; a++) o[a] = c[a];
  }
  
  function pow2523(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++) c[a] = i[a];
    for (a = 250; a >= 0; a--) {
        S(c, c);
        if(a !== 1) M(c, c, i);
    }
    for (a = 0; a < 16; a++) o[a] = c[a];
  }
  
  function crypto_scalarmult(q, n, p) {
    var z = new Uint8Array(32);
    var x = new Float64Array(80), r, i;
    var a = gf(), b = gf(), c = gf(),
        d = gf(), e = gf(), f = gf();
    for (i = 0; i < 31; i++) z[i] = n[i];
    z[31]=(n[31]&127)|64;
    z[0]&=248;
    unpack25519(x,p);
    for (i = 0; i < 16; i++) {
      b[i]=x[i];
      d[i]=a[i]=c[i]=0;
    }
    a[0]=d[0]=1;
    for (i=254; i>=0; --i) {
      r=(z[i>>>3]>>>(i&7))&1;
      sel25519(a,b,r);
      sel25519(c,d,r);
      A(e,a,c);
      Z(a,a,c);
      A(c,b,d);
      Z(b,b,d);
      S(d,e);
      S(f,a);
      M(a,c,a);
      M(c,b,e);
      A(e,a,c);
      Z(a,a,c);
      S(b,a);
      Z(c,d,f);
      M(a,c,_121665);
      A(a,a,d);
      M(c,c,a);
      M(a,d,f);
      M(d,b,x);
      S(b,e);
      sel25519(a,b,r);
      sel25519(c,d,r);
    }
    for (i = 0; i < 16; i++) {
      x[i+16]=a[i];
      x[i+32]=c[i];
      x[i+48]=b[i];
      x[i+64]=d[i];
    }
    var x32 = x.subarray(32);
    var x16 = x.subarray(16);
    inv25519(x32,x32);
    M(x16,x16,x32);
    pack25519(q,x16);
    return 0;
  }
  
  function crypto_scalarmult_base(q, n) {
    return crypto_scalarmult(q, n, _9);
  }
  
  function crypto_box_keypair(y, x) {
    randombytes(x, 32);
    return crypto_scalarmult_base(y, x);
  }
  
  function crypto_box_beforenm(k, y, x) {
    var s = new Uint8Array(32);
    crypto_scalarmult(s, x, y);
    return crypto_core_hsalsa20(k, _0, s, sigma);
  }
  
  var crypto_box_afternm = crypto_secretbox;
  var crypto_box_open_afternm = crypto_secretbox_open;
  
  function crypto_box(c, m, d, n, y, x) {
    var k = new Uint8Array(32);
    crypto_box_beforenm(k, y, x);
    return crypto_box_afternm(c, m, d, n, k);
  }
  
  function crypto_box_open(m, c, d, n, y, x) {
    var k = new Uint8Array(32);
    crypto_box_beforenm(k, y, x);
    return crypto_box_open_afternm(m, c, d, n, k);
  }
  
  function add64() {
    var a = 0, b = 0, c = 0, d = 0, m16 = 65535, l, h, i;
    for (i = 0; i < arguments.length; i++) {
      l = arguments[i].lo;
      h = arguments[i].hi;
      a += (l & m16); b += (l >>> 16);
      c += (h & m16); d += (h >>> 16);
    }
  
    b += (a >>> 16);
    c += (b >>> 16);
    d += (c >>> 16);
  
    return new u64((c & m16) | (d << 16), (a & m16) | (b << 16));
  }
  
  function shr64(x, c) {
    return new u64((x.hi >>> c), (x.lo >>> c) | (x.hi << (32 - c)));
  }
  
  function xor64() {
    var l = 0, h = 0, i;
    for (i = 0; i < arguments.length; i++) {
      l ^= arguments[i].lo;
      h ^= arguments[i].hi;
    }
    return new u64(h, l);
  }
  
  function R(x, c) {
    var h, l, c1 = 32 - c;
    if (c < 32) {
      h = (x.hi >>> c) | (x.lo << c1);
      l = (x.lo >>> c) | (x.hi << c1);
    } else if (c < 64) {
      h = (x.lo >>> c) | (x.hi << c1);
      l = (x.hi >>> c) | (x.lo << c1);
    }
    return new u64(h, l);
  }
  
  function Ch(x, y, z) {
    var h = (x.hi & y.hi) ^ (~x.hi & z.hi),
        l = (x.lo & y.lo) ^ (~x.lo & z.lo);
    return new u64(h, l);
  }
  
  function Maj(x, y, z) {
    var h = (x.hi & y.hi) ^ (x.hi & z.hi) ^ (y.hi & z.hi),
        l = (x.lo & y.lo) ^ (x.lo & z.lo) ^ (y.lo & z.lo);
    return new u64(h, l);
  }
  
  function Sigma0(x) { return xor64(R(x,28), R(x,34), R(x,39)); }
  function Sigma1(x) { return xor64(R(x,14), R(x,18), R(x,41)); }
  function sigma0(x) { return xor64(R(x, 1), R(x, 8), shr64(x,7)); }
  function sigma1(x) { return xor64(R(x,19), R(x,61), shr64(x,6)); }
  
  var K = [
    new u64(0x428a2f98, 0xd728ae22), new u64(0x71374491, 0x23ef65cd),
    new u64(0xb5c0fbcf, 0xec4d3b2f), new u64(0xe9b5dba5, 0x8189dbbc),
    new u64(0x3956c25b, 0xf348b538), new u64(0x59f111f1, 0xb605d019),
    new u64(0x923f82a4, 0xaf194f9b), new u64(0xab1c5ed5, 0xda6d8118),
    new u64(0xd807aa98, 0xa3030242), new u64(0x12835b01, 0x45706fbe),
    new u64(0x243185be, 0x4ee4b28c), new u64(0x550c7dc3, 0xd5ffb4e2),
    new u64(0x72be5d74, 0xf27b896f), new u64(0x80deb1fe, 0x3b1696b1),
    new u64(0x9bdc06a7, 0x25c71235), new u64(0xc19bf174, 0xcf692694),
    new u64(0xe49b69c1, 0x9ef14ad2), new u64(0xefbe4786, 0x384f25e3),
    new u64(0x0fc19dc6, 0x8b8cd5b5), new u64(0x240ca1cc, 0x77ac9c65),
    new u64(0x2de92c6f, 0x592b0275), new u64(0x4a7484aa, 0x6ea6e483),
    new u64(0x5cb0a9dc, 0xbd41fbd4), new u64(0x76f988da, 0x831153b5),
    new u64(0x983e5152, 0xee66dfab), new u64(0xa831c66d, 0x2db43210),
    new u64(0xb00327c8, 0x98fb213f), new u64(0xbf597fc7, 0xbeef0ee4),
    new u64(0xc6e00bf3, 0x3da88fc2), new u64(0xd5a79147, 0x930aa725),
    new u64(0x06ca6351, 0xe003826f), new u64(0x14292967, 0x0a0e6e70),
    new u64(0x27b70a85, 0x46d22ffc), new u64(0x2e1b2138, 0x5c26c926),
    new u64(0x4d2c6dfc, 0x5ac42aed), new u64(0x53380d13, 0x9d95b3df),
    new u64(0x650a7354, 0x8baf63de), new u64(0x766a0abb, 0x3c77b2a8),
    new u64(0x81c2c92e, 0x47edaee6), new u64(0x92722c85, 0x1482353b),
    new u64(0xa2bfe8a1, 0x4cf10364), new u64(0xa81a664b, 0xbc423001),
    new u64(0xc24b8b70, 0xd0f89791), new u64(0xc76c51a3, 0x0654be30),
    new u64(0xd192e819, 0xd6ef5218), new u64(0xd6990624, 0x5565a910),
    new u64(0xf40e3585, 0x5771202a), new u64(0x106aa070, 0x32bbd1b8),
    new u64(0x19a4c116, 0xb8d2d0c8), new u64(0x1e376c08, 0x5141ab53),
    new u64(0x2748774c, 0xdf8eeb99), new u64(0x34b0bcb5, 0xe19b48a8),
    new u64(0x391c0cb3, 0xc5c95a63), new u64(0x4ed8aa4a, 0xe3418acb),
    new u64(0x5b9cca4f, 0x7763e373), new u64(0x682e6ff3, 0xd6b2b8a3),
    new u64(0x748f82ee, 0x5defb2fc), new u64(0x78a5636f, 0x43172f60),
    new u64(0x84c87814, 0xa1f0ab72), new u64(0x8cc70208, 0x1a6439ec),
    new u64(0x90befffa, 0x23631e28), new u64(0xa4506ceb, 0xde82bde9),
    new u64(0xbef9a3f7, 0xb2c67915), new u64(0xc67178f2, 0xe372532b),
    new u64(0xca273ece, 0xea26619c), new u64(0xd186b8c7, 0x21c0c207),
    new u64(0xeada7dd6, 0xcde0eb1e), new u64(0xf57d4f7f, 0xee6ed178),
    new u64(0x06f067aa, 0x72176fba), new u64(0x0a637dc5, 0xa2c898a6),
    new u64(0x113f9804, 0xbef90dae), new u64(0x1b710b35, 0x131c471b),
    new u64(0x28db77f5, 0x23047d84), new u64(0x32caab7b, 0x40c72493),
    new u64(0x3c9ebe0a, 0x15c9bebc), new u64(0x431d67c4, 0x9c100d4c),
    new u64(0x4cc5d4be, 0xcb3e42b6), new u64(0x597f299c, 0xfc657e2a),
    new u64(0x5fcb6fab, 0x3ad6faec), new u64(0x6c44198c, 0x4a475817)
  ];
  
  function crypto_hashblocks(x, m, n) {
    var z = [], b = [], a = [], w = [], t, i, j;
  
    for (i = 0; i < 8; i++) z[i] = a[i] = dl64(x, 8*i);
  
    var pos = 0;
    while (n >= 128) {
      for (i = 0; i < 16; i++) w[i] = dl64(m, 8*i+pos);
      for (i = 0; i < 80; i++) {
        for (j = 0; j < 8; j++) b[j] = a[j];
        t = add64(a[7], Sigma1(a[4]), Ch(a[4], a[5], a[6]), K[i], w[i%16]);
        b[7] = add64(t, Sigma0(a[0]), Maj(a[0], a[1], a[2]));
        b[3] = add64(b[3], t);
        for (j = 0; j < 8; j++) a[(j+1)%8] = b[j];
        if (i%16 === 15) {
          for (j = 0; j < 16; j++) {
            w[j] = add64(w[j], w[(j+9)%16], sigma0(w[(j+1)%16]), sigma1(w[(j+14)%16]));
          }
        }
      }
  
      for (i = 0; i < 8; i++) {
        a[i] = add64(a[i], z[i]);
        z[i] = a[i];
      }
  
      pos += 128;
      n -= 128;
    }
  
    for (i = 0; i < 8; i++) ts64(x, 8*i, z[i]);
    return n;
  }
  
  var iv = new Uint8Array([
    0x6a,0x09,0xe6,0x67,0xf3,0xbc,0xc9,0x08,
    0xbb,0x67,0xae,0x85,0x84,0xca,0xa7,0x3b,
    0x3c,0x6e,0xf3,0x72,0xfe,0x94,0xf8,0x2b,
    0xa5,0x4f,0xf5,0x3a,0x5f,0x1d,0x36,0xf1,
    0x51,0x0e,0x52,0x7f,0xad,0xe6,0x82,0xd1,
    0x9b,0x05,0x68,0x8c,0x2b,0x3e,0x6c,0x1f,
    0x1f,0x83,0xd9,0xab,0xfb,0x41,0xbd,0x6b,
    0x5b,0xe0,0xcd,0x19,0x13,0x7e,0x21,0x79
  ]);
  
  function crypto_hash(out, m, n) {
    var h = new Uint8Array(64), x = new Uint8Array(256);
    var i, b = n;
  
    for (i = 0; i < 64; i++) h[i] = iv[i];
  
    crypto_hashblocks(h, m, n);
    n %= 128;
  
    for (i = 0; i < 256; i++) x[i] = 0;
    for (i = 0; i < n; i++) x[i] = m[b-n+i];
    x[n] = 128;
  
    n = 256-128*(n<112?1:0);
    x[n-9] = 0;
    ts64(x, n-8, new u64((b / 0x20000000) | 0, b << 3));
    crypto_hashblocks(h, x, n);
  
    for (i = 0; i < 64; i++) out[i] = h[i];
  
    return 0;
  }
  
  function add(p, q) {
    var a = gf(), b = gf(), c = gf(),
        d = gf(), e = gf(), f = gf(),
        g = gf(), h = gf(), t = gf();
  
    Z(a, p[1], p[0]);
    Z(t, q[1], q[0]);
    M(a, a, t);
    A(b, p[0], p[1]);
    A(t, q[0], q[1]);
    M(b, b, t);
    M(c, p[3], q[3]);
    M(c, c, D2);
    M(d, p[2], q[2]);
    A(d, d, d);
    Z(e, b, a);
    Z(f, d, c);
    A(g, d, c);
    A(h, b, a);
  
    M(p[0], e, f);
    M(p[1], h, g);
    M(p[2], g, f);
    M(p[3], e, h);
  }
  
  function cswap(p, q, b) {
    var i;
    for (i = 0; i < 4; i++) {
      sel25519(p[i], q[i], b);
    }
  }
  
  function pack(r, p) {
    var tx = gf(), ty = gf(), zi = gf();
    inv25519(zi, p[2]);
    M(tx, p[0], zi);
    M(ty, p[1], zi);
    pack25519(r, ty);
    r[31] ^= par25519(tx) << 7;
  }
  
  function scalarmult(p, q, s) {
    var b, i;
    set25519(p[0], gf0);
    set25519(p[1], gf1);
    set25519(p[2], gf1);
    set25519(p[3], gf0);
    for (i = 255; i >= 0; --i) {
      b = (s[(i/8)|0] >> (i&7)) & 1;
      cswap(p, q, b);
      add(q, p);
      add(p, p);
      cswap(p, q, b);
    }
  }
  
  function scalarbase(p, s) {
    var q = [gf(), gf(), gf(), gf()];
    set25519(q[0], X);
    set25519(q[1], Y);
    set25519(q[2], gf1);
    M(q[3], X, Y);
    scalarmult(p, q, s);
  }
  
  function crypto_sign_keypair(pk, sk, seeded) {
    var d = new Uint8Array(64);
    var p = [gf(), gf(), gf(), gf()];
    var i;
  
    if (!seeded) randombytes(sk, 32);
    crypto_hash(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
  
    scalarbase(p, d);
    pack(pk, p);
  
    for (i = 0; i < 32; i++) sk[i+32] = pk[i];
    return 0;
  }
  
  var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);
  
  function modL(r, x) {
    var carry, i, j, k;
    for (i = 63; i >= 32; --i) {
      carry = 0;
      for (j = i - 32, k = i - 12; j < k; ++j) {
        x[j] += carry - 16 * x[i] * L[j - (i - 32)];
        carry = Math.floor((x[j] + 128) / 256);
        x[j] -= carry * 256;
      }
      x[j] += carry;
      x[i] = 0;
    }
    carry = 0;
    for (j = 0; j < 32; j++) {
      x[j] += carry - (x[31] >> 4) * L[j];
      carry = x[j] >> 8;
      x[j] &= 255;
    }
    for (j = 0; j < 32; j++) x[j] -= carry * L[j];
    for (i = 0; i < 32; i++) {
      x[i+1] += x[i] >> 8;
      r[i] = x[i] & 255;
    }
  }
  
  function reduce(r) {
    var x = new Float64Array(64), i;
    for (i = 0; i < 64; i++) x[i] = r[i];
    for (i = 0; i < 64; i++) r[i] = 0;
    modL(r, x);
  }
  
  // Note: difference from C - smlen returned, not passed as argument.
  function crypto_sign(sm, m, n, sk) {
    var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
    var i, j, x = new Float64Array(64);
    var p = [gf(), gf(), gf(), gf()];
  
    crypto_hash(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
  
    var smlen = n + 64;
    for (i = 0; i < n; i++) sm[64 + i] = m[i];
    for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];
  
    crypto_hash(r, sm.subarray(32), n+32);
    reduce(r);
    scalarbase(p, r);
    pack(sm, p);
  
    for (i = 32; i < 64; i++) sm[i] = sk[i];
    crypto_hash(h, sm, n + 64);
    reduce(h);
  
    for (i = 0; i < 64; i++) x[i] = 0;
    for (i = 0; i < 32; i++) x[i] = r[i];
    for (i = 0; i < 32; i++) {
      for (j = 0; j < 32; j++) {
        x[i+j] += h[i] * d[j];
      }
    }
  
    modL(sm.subarray(32), x);
    return smlen;
  }
  
  function unpackneg(r, p) {
    var t = gf(), chk = gf(), num = gf(),
        den = gf(), den2 = gf(), den4 = gf(),
        den6 = gf();
  
    set25519(r[2], gf1);
    unpack25519(r[1], p);
    S(num, r[1]);
    M(den, num, D);
    Z(num, num, r[2]);
    A(den, r[2], den);
  
    S(den2, den);
    S(den4, den2);
    M(den6, den4, den2);
    M(t, den6, num);
    M(t, t, den);
  
    pow2523(t, t);
    M(t, t, num);
    M(t, t, den);
    M(t, t, den);
    M(r[0], t, den);
  
    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num)) M(r[0], r[0], I);
  
    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num)) return -1;
  
    if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);
  
    M(r[3], r[0], r[1]);
    return 0;
  }
  
  function crypto_sign_open(m, sm, n, pk) {
    var i;
    var t = new Uint8Array(32), h = new Uint8Array(64);
    var p = [gf(), gf(), gf(), gf()],
        q = [gf(), gf(), gf(), gf()];
  
    if (n < 64) return -1;
  
    if (unpackneg(q, pk)) return -1;
  
    for (i = 0; i < n; i++) m[i] = sm[i];
    for (i = 0; i < 32; i++) m[i+32] = pk[i];
    crypto_hash(h, m, n);
    reduce(h);
    scalarmult(p, q, h);
  
    scalarbase(q, sm.subarray(32));
    add(p, q);
    pack(t, p);
  
    n -= 64;
    if (crypto_verify_32(sm, 0, t, 0)) {
      for (i = 0; i < n; i++) m[i] = 0;
      return -1;
    }
  
    for (i = 0; i < n; i++) m[i] = sm[i + 64];
    return n;
  }
  
  var crypto_secretbox_KEYBYTES = 32,
      crypto_secretbox_NONCEBYTES = 24,
      crypto_secretbox_ZEROBYTES = 32,
      crypto_secretbox_BOXZEROBYTES = 16,
      crypto_scalarmult_BYTES = 32,
      crypto_scalarmult_SCALARBYTES = 32,
      crypto_box_PUBLICKEYBYTES = 32,
      crypto_box_SECRETKEYBYTES = 32,
      crypto_box_BEFORENMBYTES = 32,
      crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
      crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
      crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
      crypto_sign_BYTES = 64,
      crypto_sign_PUBLICKEYBYTES = 32,
      crypto_sign_SECRETKEYBYTES = 64,
      crypto_sign_SEEDBYTES = 32,
      crypto_hash_BYTES = 64;
  
  nacl.lowlevel = {
    crypto_core_hsalsa20: crypto_core_hsalsa20,
    crypto_stream_xor: crypto_stream_xor,
    crypto_stream: crypto_stream,
    crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
    crypto_stream_salsa20: crypto_stream_salsa20,
    crypto_onetimeauth: crypto_onetimeauth,
    crypto_onetimeauth_verify: crypto_onetimeauth_verify,
    crypto_verify_16: crypto_verify_16,
    crypto_verify_32: crypto_verify_32,
    crypto_secretbox: crypto_secretbox,
    crypto_secretbox_open: crypto_secretbox_open,
    crypto_scalarmult: crypto_scalarmult,
    crypto_scalarmult_base: crypto_scalarmult_base,
    crypto_box_beforenm: crypto_box_beforenm,
    crypto_box_afternm: crypto_box_afternm,
    crypto_box: crypto_box,
    crypto_box_open: crypto_box_open,
    crypto_box_keypair: crypto_box_keypair,
    crypto_hash: crypto_hash,
    crypto_sign: crypto_sign,
    crypto_sign_keypair: crypto_sign_keypair,
    crypto_sign_open: crypto_sign_open,
  
    crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
    crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
    crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
    crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
    crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
    crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
    crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
    crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
    crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
    crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
    crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
    crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
    crypto_sign_BYTES: crypto_sign_BYTES,
    crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
    crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
    crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
    crypto_hash_BYTES: crypto_hash_BYTES,
  
    gf: gf,
    D: D,
    L: L,
    pack25519: pack25519,
    unpack25519: unpack25519,
    M: M,
    A: A,
    S: S,
    Z: Z,
    pow2523: pow2523,
    add: add,
    set25519: set25519,
    modL: modL,
    scalarmult: scalarmult,
    scalarbase: scalarbase,
  };
  
  /* High-level API */
  
  function checkLengths(k, n) {
    if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
    if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
  }
  
  function checkBoxLengths(pk, sk) {
    if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
    if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
  }
  
  function checkArrayTypes() {
    for (var i = 0; i < arguments.length; i++) {
      if (!(arguments[i] instanceof Uint8Array))
        throw new TypeError('unexpected type, use Uint8Array');
    }
  }
  
  function cleanup(arr) {
    for (var i = 0; i < arr.length; i++) arr[i] = 0;
  }
  
  nacl.randomBytes = function(n) {
    var b = new Uint8Array(n);
    randombytes(b, n);
    return b;
  };
  
  nacl.secretbox = function(msg, nonce, key) {
    checkArrayTypes(msg, nonce, key);
    checkLengths(key, nonce);
    var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
    var c = new Uint8Array(m.length);
    for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
    crypto_secretbox(c, m, m.length, nonce, key);
    return c.subarray(crypto_secretbox_BOXZEROBYTES);
  };
  
  nacl.secretbox.open = function(box, nonce, key) {
    checkArrayTypes(box, nonce, key);
    checkLengths(key, nonce);
    var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
    var m = new Uint8Array(c.length);
    for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
    if (c.length < 32) return null;
    if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
    return m.subarray(crypto_secretbox_ZEROBYTES);
  };
  
  nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
  nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
  nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
  
  nacl.scalarMult = function(n, p) {
    checkArrayTypes(n, p);
    if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
    if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
    var q = new Uint8Array(crypto_scalarmult_BYTES);
    crypto_scalarmult(q, n, p);
    return q;
  };
  
  nacl.scalarMult.base = function(n) {
    checkArrayTypes(n);
    if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
    var q = new Uint8Array(crypto_scalarmult_BYTES);
    crypto_scalarmult_base(q, n);
    return q;
  };
  
  nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
  nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
  
  nacl.box = function(msg, nonce, publicKey, secretKey) {
    var k = nacl.box.before(publicKey, secretKey);
    return nacl.secretbox(msg, nonce, k);
  };
  
  nacl.box.before = function(publicKey, secretKey) {
    checkArrayTypes(publicKey, secretKey);
    checkBoxLengths(publicKey, secretKey);
    var k = new Uint8Array(crypto_box_BEFORENMBYTES);
    crypto_box_beforenm(k, publicKey, secretKey);
    return k;
  };
  
  nacl.box.after = nacl.secretbox;
  
  nacl.box.open = function(msg, nonce, publicKey, secretKey) {
    var k = nacl.box.before(publicKey, secretKey);
    return nacl.secretbox.open(msg, nonce, k);
  };
  
  nacl.box.open.after = nacl.secretbox.open;
  
  nacl.box.keyPair = function() {
    var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
    crypto_box_keypair(pk, sk);
    return {publicKey: pk, secretKey: sk};
  };
  
  nacl.box.keyPair.fromSecretKey = function(secretKey) {
    checkArrayTypes(secretKey);
    if (secretKey.length !== crypto_box_SECRETKEYBYTES)
      throw new Error('bad secret key size');
    var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
    crypto_scalarmult_base(pk, secretKey);
    return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
  };
  
  nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
  nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
  nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
  nacl.box.nonceLength = crypto_box_NONCEBYTES;
  nacl.box.overheadLength = nacl.secretbox.overheadLength;
  
  nacl.sign = function(msg, secretKey) {
    checkArrayTypes(msg, secretKey);
    if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
      throw new Error('bad secret key size');
    var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
    crypto_sign(signedMsg, msg, msg.length, secretKey);
    return signedMsg;
  };
  
  nacl.sign.open = function(signedMsg, publicKey) {
    checkArrayTypes(signedMsg, publicKey);
    if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
      throw new Error('bad public key size');
    var tmp = new Uint8Array(signedMsg.length);
    var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
    if (mlen < 0) return null;
    var m = new Uint8Array(mlen);
    for (var i = 0; i < m.length; i++) m[i] = tmp[i];
    return m;
  };
  
  nacl.sign.detached = function(msg, secretKey) {
    var signedMsg = nacl.sign(msg, secretKey);
    var sig = new Uint8Array(crypto_sign_BYTES);
    for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
    return sig;
  };
  
  nacl.sign.detached.verify = function(msg, sig, publicKey) {
    checkArrayTypes(msg, sig, publicKey);
    if (sig.length !== crypto_sign_BYTES)
      throw new Error('bad signature size');
    if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
      throw new Error('bad public key size');
    var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
    var m = new Uint8Array(crypto_sign_BYTES + msg.length);
    var i;
    for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
    for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
    return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
  };
  
  nacl.sign.keyPair = function() {
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
    crypto_sign_keypair(pk, sk);
    return {publicKey: pk, secretKey: sk};
  };
  
  nacl.sign.keyPair.fromSecretKey = function(secretKey) {
    checkArrayTypes(secretKey);
    if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
      throw new Error('bad secret key size');
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
    return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
  };
  
  nacl.sign.keyPair.fromSeed = function(seed) {
    checkArrayTypes(seed);
    if (seed.length !== crypto_sign_SEEDBYTES)
      throw new Error('bad seed size');
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
    for (var i = 0; i < 32; i++) sk[i] = seed[i];
    crypto_sign_keypair(pk, sk, true);
    return {publicKey: pk, secretKey: sk};
  };
  
  nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
  nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
  nacl.sign.seedLength = crypto_sign_SEEDBYTES;
  nacl.sign.signatureLength = crypto_sign_BYTES;
  
  nacl.hash = function(msg) {
    checkArrayTypes(msg);
    var h = new Uint8Array(crypto_hash_BYTES);
    crypto_hash(h, msg, msg.length);
    return h;
  };
  
  nacl.hash.hashLength = crypto_hash_BYTES;
  
  nacl.verify = function(x, y) {
    checkArrayTypes(x, y);
    // Zero length arguments are considered not equal.
    if (x.length === 0 || y.length === 0) return false;
    if (x.length !== y.length) return false;
    return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
  };
  
  nacl.setPRNG = function(fn) {
    randombytes = fn;
  };
  
  (function() {
    // Initialize PRNG if environment provides CSPRNG.
    // If not, methods calling randombytes will throw.
    var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
    if (crypto && crypto.getRandomValues) {
      // Browsers.
      var QUOTA = 65536;
      nacl.setPRNG(function(x, n) {
        var i, v = new Uint8Array(n);
        for (i = 0; i < n; i += QUOTA) {
          crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
        }
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    } else if (typeof require !== 'undefined') {
      // Node.js.
      crypto = require('crypto');
      if (crypto && crypto.randomBytes) {
        nacl.setPRNG(function(x, n) {
          var i, v = crypto.randomBytes(n);
          for (i = 0; i < n; i++) x[i] = v[i];
          cleanup(v);
        });
      }
    }
  })();
  
  })(typeof module !== 'undefined' && module.exports ? module.exports : (self.nacl = self.nacl || {}));
  
  'use strict';

var global$1 = (typeof global !== "undefined" ? global :
            typeof self !== "undefined" ? self :
            typeof window !== "undefined" ? window : {});

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
var inited = false;
function init () {
  inited = true;
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }

  revLookup['-'.charCodeAt(0)] = 62;
  revLookup['_'.charCodeAt(0)] = 63;
}

function toByteArray (b64) {
  if (!inited) {
    init();
  }
  var i, j, l, tmp, placeHolders, arr;
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders);

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len;

  var L = 0;

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
    arr[L++] = (tmp >> 16) & 0xFF;
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[L++] = tmp & 0xFF;
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  if (!inited) {
    init();
  }
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var output = '';
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    output += lookup[tmp >> 2];
    output += lookup[(tmp << 4) & 0x3F];
    output += '==';
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
    output += lookup[tmp >> 10];
    output += lookup[(tmp >> 4) & 0x3F];
    output += lookup[(tmp << 2) & 0x3F];
    output += '=';
  }

  parts.push(output);

  return parts.join('')
}

function read (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

function write (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
}

var toString = {}.toString;

var isArray = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

var INSPECT_MAX_BYTES = 50;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
  ? global$1.TYPED_ARRAY_SUPPORT
  : true;

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length);
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length);
    }
    that.length = length;
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192; // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype;
  return arr
};

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
};

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype;
  Buffer.__proto__ = Uint8Array;
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
};

function allocUnsafe (that, size) {
  assertSize(size);
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0;
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
};

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0;
  that = createBuffer(that, length);

  var actual = that.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual);
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  that = createBuffer(that, length);
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255;
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength; // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array);
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset);
  } else {
    array = new Uint8Array(array, byteOffset, length);
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array;
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array);
  }
  return that
}

function fromObject (that, obj) {
  if (internalIsBuffer(obj)) {
    var len = checked(obj.length) | 0;
    that = createBuffer(that, len);

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len);
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}
Buffer.isBuffer = isBuffer;
function internalIsBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
};

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  var buffer = Buffer.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (!internalIsBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer
};

function byteLength (string, encoding) {
  if (internalIsBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string;
  }

  var len = string.length;
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;

function slowToString (encoding, start, end) {
  var loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true;

function swap (b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this
};

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this
};

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this
};

Buffer.prototype.toString = function toString () {
  var length = this.length | 0;
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
};

Buffer.prototype.equals = function equals (b) {
  if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
};

Buffer.prototype.inspect = function inspect () {
  var str = '';
  var max = INSPECT_MAX_BYTES;
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
    if (this.length > max) str += ' ... ';
  }
  return '<Buffer ' + str + '>'
};

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!internalIsBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0

  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);

  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset;  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1);
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (internalIsBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
};

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
};

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
};

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed;
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0;
    if (isFinite(length)) {
      length = length | 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8';

  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
};

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return fromByteArray(buf)
  } else {
    return fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];

  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1;

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = '';
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = '';
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  var newBuf;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end);
    newBuf.__proto__ = Buffer.prototype;
  } else {
    var sliceLen = end - start;
    newBuf = new Buffer(sliceLen, undefined);
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start];
    }
  }

  return newBuf
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val
};

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  var val = this[offset + --byteLength];
  var mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val
};

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset]
};

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | (this[offset + 1] << 8)
};

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return (this[offset] << 8) | this[offset + 1]
};

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
};

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
};

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var i = byteLength;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
};

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset] | (this[offset + 1] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | (this[offset] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
};

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
};

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, true, 23, 4)
};

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, false, 23, 4)
};

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, true, 52, 8)
};

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, false, 52, 8)
};

function checkInt (buf, value, offset, ext, max, min) {
  if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var mul = 1;
  var i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var i = byteLength - 1;
  var mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  this[offset] = (value & 0xff);
  return offset + 1
};

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8;
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24);
    this[offset + 2] = (value >>> 16);
    this[offset + 1] = (value >>> 8);
    this[offset] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = byteLength - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    this[offset + 2] = (value >>> 16);
    this[offset + 3] = (value >>> 24);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4);
  }
  write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
};

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
};

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8);
  }
  write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
};

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  var len = end - start;
  var i;

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    );
  }

  return len
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if (code < 256) {
        val = code;
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  var i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = internalIsBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString());
    var len = bytes.length;
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this
};

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        }

        // valid lead
        leadSurrogate = codePoint;

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray
}


function base64ToBytes (str) {
  return toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i];
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}


// the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
function isBuffer(obj) {
  return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
}

function isFastBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

function getCjsExportFromNamespace (n) {
	return n && n['default'] || n;
}

var dist = createCommonjsModule(function (module, exports) {
(function (global, factory) {
     factory(exports) ;
}(commonjsGlobal, (function (exports) {
    class ValidateTypes {
      constructor() {}

      getType(value) {
        return Object.prototype.toString.call(value);
      }

      getClassName(value) {
        try {
          return value.constructor.name;
        } catch (e) {}

        return this.getType(value);
      } //Validation functions


      isObject(value) {
        if (this.getType(value) === "[object Object]") return true;
        return false;
      }

      isFunction(value) {
        if (this.getType(value) === "[object Function]") return true;
        return false;
      }

      isString(value) {
        if (this.getType(value) === "[object String]") return true;
        return false;
      }

      isBoolean(value) {
        if (this.getType(value) === "[object Boolean]") return true;
        return false;
      }

      isArray(value) {
        if (this.getType(value) === "[object Array]") return true;
        return false;
      }

      isNumber(value) {
        if (this.getType(value) === "[object Number]") return true;
        return false;
      }

      isInteger(value) {
        if (this.getType(value) === "[object Number]" && Number.isInteger(value)) return true;
        return false;
      }

      isRegEx(value) {
        if (this.getType(value) === "[object RegExp]") return true;
        return false;
      }

      isStringHex(value) {
        if (!this.isStringWithValue(value)) return false;
        let hexRegEx = /([0-9]|[a-f])/gim;
        return (value.match(hexRegEx) || []).length === value.length;
      }

      hasKeys(value, keys) {
        if (keys.map(key => key in value).includes(false)) return false;
        return true;
      }

      isStringWithValue(value) {
        if (this.isString(value) && value !== '') return true;
        return false;
      }

      isObjectWithKeys(value) {
        if (this.isObject(value) && Object.keys(value).length > 0) return true;
        return false;
      }

      isArrayWithValues(value) {
        if (this.isArray(value) && value.length > 0) return true;
        return false;
      }

      isSpecificClass(value, className) {
        if (!this.isObject(value)) return false;
        if (this.getClassName(value) !== className) return false;
        return true;
      }

    }

    class AssertTypes {
      constructor() {
        this.validate = new ValidateTypes();
      } //Validation functions


      isObject(value) {
        if (!this.validate.isObject(value)) {
          throw new TypeError(`Expected type [object Object] but got ${this.validate.getType(value)}`);
        }

        return true;
      }

      isFunction(value) {
        if (!this.validate.isFunction(value)) {
          throw new TypeError(`Expected type [object Function] but got ${this.validate.getType(value)}`);
        }

        return true;
      }

      isString(value) {
        if (!this.validate.isString(value)) {
          throw new TypeError(`Expected type [object String] but got ${this.validate.getType(value)}`);
        }

        return true;
      }

      isBoolean(value) {
        if (!this.validate.isBoolean(value)) {
          throw new TypeError(`Expected type [object Boolean] but got ${this.validate.getType(value)}`);
        }

        return true;
      }

      isArray(value) {
        if (!this.validate.isArray(value)) {
          throw new TypeError(`Expected type [object Array] but got ${this.validate.getType(value)}`);
        }

        return true;
      }

      isNumber(value) {
        if (!this.validate.isNumber(value)) {
          throw new TypeError(`Expected type [object Number] but got ${this.validate.getType(value)}`);
        }

        return true;
      }

      isInteger(value) {
        if (!this.validate.isInteger(value)) {
          throw new TypeError(`Expected "${value}" to be an integer but got non-integer value`);
        }

        return true;
      }

      isRegEx(value) {
        if (!this.validate.isRegEx(value)) {
          throw new TypeError(`Expected type [object RegExp] but got ${this.validate.getType(value)}`);
        }

        return true;
      }

      isStringHex(value) {
        if (!this.validate.isStringHex(value)) {
          throw new TypeError(`Expected "${value}" to be hex but got non-hex value`);
        }

        return true;
      }

      hasKeys(value, keys) {
        if (!this.validate.hasKeys(value, keys)) {
          throw new TypeError(`Provided object does not contain all keys ${JSON.stringify(keys)}`);
        }

        return true;
      }

      isStringWithValue(value) {
        if (!this.validate.isStringWithValue(value)) {
          throw new TypeError(`Expected "${value}" to be [object String] and not empty`);
        }

        return true;
      }

      isObjectWithKeys(value) {
        if (!this.validate.isObjectWithKeys(value)) {
          throw new TypeError(`Expected "${value}" to be [object Object] and have keys`);
        }

        return true;
      }

      isArrayWithValues(value) {
        if (!this.validate.isArrayWithValues(value)) {
          throw new TypeError(`Expected "${value}" to be [object Array] and not empty`);
        }

        return true;
      }

      isSpecificClass(value, className) {
        if (!this.validate.isSpecificClass(value, className)) {
          throw new TypeError(`Expected Object Class to be "${className}" but got ${this.validate.getClassName(value)}`);
        }

        return true;
      }

    }

    const validateTypes = new ValidateTypes();
    const assertTypes = new AssertTypes();

    exports.assertTypes = assertTypes;
    exports.validateTypes = validateTypes;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
});

var validators = unwrapExports(dist);

function buf2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}
function hex2buf(hexString) {
    var bytes = new Uint8Array(Math.ceil(hexString.length / 2));
    for (var i = 0; i < bytes.length; i++)
        bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    return bytes;
}
function concatUint8Arrays(array1, array2) {
    var arr = new Uint8Array(array1.length + array2.length);
    arr.set(array1);
    arr.set(array2, array1.length);
    return arr;
}

const nacl = require('tweetnacl');

/**
 * @param Uint8Array(length: 32) seed
 *      seed:   A Uint8Array with a length of 32 to seed the keyPair with. This is advanced behavior and should be
 *              avoided by everyday users
 *
 * @return {Uint8Array(length: 32), Uint8Array(length: 32)} { vk, sk }
 *      sk:     Signing Key (SK) represents 32 byte signing key
 *      vk:     Verify Key (VK) represents a 32 byte verify key
 */
function generate_keys(seed = null) {
    var kp = null;
    if (seed == null) {
        kp = nacl.sign.keyPair();
    }
    else {
        kp = nacl.sign.keyPair.fromSeed(seed);
    }
    // In the JS implementation of the NaCL library the sk is the first 32 bytes of the secretKey
    // and the vk is the last 32 bytes of the secretKey as well as the publicKey
    // {
    //   'publicKey': <vk>,
    //   'secretKey': <sk><vk>
    // }
    return {
        sk: new Uint8Array(kp['secretKey'].slice(0, 32)),
        vk: new Uint8Array(kp['secretKey'].slice(32, 64))
    };
}
/**
 * @param String sk
 *      sk:     A 64 character long hex representation of a signing key (private key)
 *
 * @return String vk
 *      vk:     A 64 character long hex representation of a verify key (public key)
 */
function get_vk(sk) {
    var kp = format_to_keys(sk);
    var kpf = keys_to_format(kp);
    return kpf.vk;
}
/**
 * @param String sk
 *      sk:     A 64 character long hex representation of a signing key (private key)
 *
 * @return {Uint8Array(length: 32), Uint8Array(length: 32)} { vk, sk }
 *      sk:     Signing Key (SK) represents 32 byte signing key
 *      vk:     Verify Key (VK) represents a 32 byte verify key
 */
function format_to_keys(sk) {
    var skf = hex2buf(sk);
    var kp = generate_keys(skf);
    return kp;
}
/**
 * @param Object kp
 *      kp:     Object containing the properties sk and vk
 *          sk:     Signing Key (SK) represents 32 byte signing key
 *          vk:     Verify Key (VK) represents a 32 byte verify key
 *
 * @return {string, string} { sk, vk }
 *      sk:     Signing Key (SK) represented as a 64 character hex string
 *      vk:     Verify Key (VK) represented as a 64 character hex string
 */
function keys_to_format(kp) {
    return {
        vk: buf2hex(kp.vk),
        sk: buf2hex(kp.sk)
    };
}
/**
 * @param Uint8Array(length: 32) seed
 *      seed:   A Uint8Array with a length of 32 to seed the keyPair with. This is advanced behavior and should be
 *              avoided by everyday users
 *
 * @return {string, string} { sk, vk }
 *      sk:     Signing Key (SK) represented as a 64 character hex string
 *      vk:     Verify Key (VK) represented as a 64 character hex string
 */
function new_wallet(seed = null) {
    const keys = generate_keys(seed);
    return keys_to_format(keys);
}
/**
 * @param String sk
 * @param Uint8Array msg
 *      sk:     A 64 character long hex representation of a signing key (private key)
 *      msg:    A Uint8Array of bytes representing the message you would like to sign
 *
 * @return String sig
 *      sig:    A 128 character long hex string representing the message's signature
 */
function sign(sk, msg) {
    var kp = format_to_keys(sk);
    // This is required due to the secretKey required to sign a transaction
    // in the js implementation of NaCL being the combination of the sk and
    // vk for some stupid reason. That being said, we still want the sk and
    // vk objects to exist in 32-byte string format (same as cilantro's
    // python implementation) when presented to the user.
    var jsnacl_sk = concatUint8Arrays(kp.sk, kp.vk);
    return buf2hex(nacl.sign.detached(msg, jsnacl_sk));
}
/**
 * @param String vk
 * @param Uint8Array msg
 * @param String sig
 *      vk:     A 64 character long hex representation of a verify key (public key)
 *      msg:    A Uint8Array (bytes) representation of a message that has been signed
 *      sig:    A 128 character long hex representation of a nacl signature
 *
 * @return Bool result
 *      result: true if verify checked out, false if not
 */
function verify(vk, msg, sig) {
    var vkb = hex2buf(vk);
    var sigb = hex2buf(sig);
    try {
        return nacl.sign.detached.verify(msg, sigb, vkb);
    }
    catch (_a) {
        return false;
    }
}

var wallet = /*#__PURE__*/Object.freeze({
            __proto__: null,
            generate_keys: generate_keys,
            get_vk: get_vk,
            format_to_keys: format_to_keys,
            keys_to_format: keys_to_format,
            new_wallet: new_wallet,
            sign: sign,
            verify: verify
});

class EventEmitter {
    constructor() {
      this._events = {};
    }
  
    on(name, listener) {
        if (!this._events[name]) {
            this._events[name] = [];
        }

        this._events[name].push(listener);
    }
  
    removeListener(name, listenerToRemove) {
        if (!this._events[name]) {
            throw new Error(`Can't remove a listener. Event "${name}" doesn't exits.`);
        }

        const filterListeners = (listener) => listener !== listenerToRemove;
        this._events[name] = this._events[name].filter(filterListeners);
    }
  
    emit(name, data) {
        if (!this._events[name]) return
  
            const fireCallbacks = (callback) => {
                callback(data);
            };
        
            this._events[name].forEach(fireCallbacks);
        }
    }

/*
 *      bignumber.js v9.0.1
 *      A JavaScript library for arbitrary-precision arithmetic.
 *      https://github.com/MikeMcl/bignumber.js
 *      Copyright (c) 2020 Michael Mclaughlin <M8ch88l@gmail.com>
 *      MIT Licensed.
 *
 *      BigNumber.prototype methods     |  BigNumber methods
 *                                      |
 *      absoluteValue            abs    |  clone
 *      comparedTo                      |  config               set
 *      decimalPlaces            dp     |      DECIMAL_PLACES
 *      dividedBy                div    |      ROUNDING_MODE
 *      dividedToIntegerBy       idiv   |      EXPONENTIAL_AT
 *      exponentiatedBy          pow    |      RANGE
 *      integerValue                    |      CRYPTO
 *      isEqualTo                eq     |      MODULO_MODE
 *      isFinite                        |      POW_PRECISION
 *      isGreaterThan            gt     |      FORMAT
 *      isGreaterThanOrEqualTo   gte    |      ALPHABET
 *      isInteger                       |  isBigNumber
 *      isLessThan               lt     |  maximum              max
 *      isLessThanOrEqualTo      lte    |  minimum              min
 *      isNaN                           |  random
 *      isNegative                      |  sum
 *      isPositive                      |
 *      isZero                          |
 *      minus                           |
 *      modulo                   mod    |
 *      multipliedBy             times  |
 *      negated                         |
 *      plus                            |
 *      precision                sd     |
 *      shiftedBy                       |
 *      squareRoot               sqrt   |
 *      toExponential                   |
 *      toFixed                         |
 *      toFormat                        |
 *      toFraction                      |
 *      toJSON                          |
 *      toNumber                        |
 *      toPrecision                     |
 *      toString                        |
 *      valueOf                         |
 *
 */


var
  isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i,

  mathceil = Math.ceil,
  mathfloor = Math.floor,

  bignumberError = '[BigNumber Error] ',
  tooManyDigits = bignumberError + 'Number primitive has more than 15 significant digits: ',

  BASE = 1e14,
  LOG_BASE = 14,
  MAX_SAFE_INTEGER = 0x1fffffffffffff,         // 2^53 - 1
  // MAX_INT32 = 0x7fffffff,                   // 2^31 - 1
  POWS_TEN = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13],
  SQRT_BASE = 1e7,

  // EDITABLE
  // The limit on the value of DECIMAL_PLACES, TO_EXP_NEG, TO_EXP_POS, MIN_EXP, MAX_EXP, and
  // the arguments to toExponential, toFixed, toFormat, and toPrecision.
  MAX = 1E9;                                   // 0 to MAX_INT32


/*
 * Create and return a BigNumber constructor.
 */
function clone(configObject) {
  var div, convertBase, parseNumeric,
    P = BigNumber.prototype = { constructor: BigNumber, toString: null, valueOf: null },
    ONE = new BigNumber(1),


    //----------------------------- EDITABLE CONFIG DEFAULTS -------------------------------


    // The default values below must be integers within the inclusive ranges stated.
    // The values can also be changed at run-time using BigNumber.set.

    // The maximum number of decimal places for operations involving division.
    DECIMAL_PLACES = 20,                     // 0 to MAX

    // The rounding mode used when rounding to the above decimal places, and when using
    // toExponential, toFixed, toFormat and toPrecision, and round (default value).
    // UP         0 Away from zero.
    // DOWN       1 Towards zero.
    // CEIL       2 Towards +Infinity.
    // FLOOR      3 Towards -Infinity.
    // HALF_UP    4 Towards nearest neighbour. If equidistant, up.
    // HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
    // HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
    // HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
    // HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
    ROUNDING_MODE = 4,                       // 0 to 8

    // EXPONENTIAL_AT : [TO_EXP_NEG , TO_EXP_POS]

    // The exponent value at and beneath which toString returns exponential notation.
    // Number type: -7
    TO_EXP_NEG = -7,                         // 0 to -MAX

    // The exponent value at and above which toString returns exponential notation.
    // Number type: 21
    TO_EXP_POS = 21,                         // 0 to MAX

    // RANGE : [MIN_EXP, MAX_EXP]

    // The minimum exponent value, beneath which underflow to zero occurs.
    // Number type: -324  (5e-324)
    MIN_EXP = -1e7,                          // -1 to -MAX

    // The maximum exponent value, above which overflow to Infinity occurs.
    // Number type:  308  (1.7976931348623157e+308)
    // For MAX_EXP > 1e7, e.g. new BigNumber('1e100000000').plus(1) may be slow.
    MAX_EXP = 1e7,                           // 1 to MAX

    // Whether to use cryptographically-secure random number generation, if available.
    CRYPTO = false,                          // true or false

    // The modulo mode used when calculating the modulus: a mod n.
    // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
    // The remainder (r) is calculated as: r = a - n * q.
    //
    // UP        0 The remainder is positive if the dividend is negative, else is negative.
    // DOWN      1 The remainder has the same sign as the dividend.
    //             This modulo mode is commonly known as 'truncated division' and is
    //             equivalent to (a % n) in JavaScript.
    // FLOOR     3 The remainder has the same sign as the divisor (Python %).
    // HALF_EVEN 6 This modulo mode implements the IEEE 754 remainder function.
    // EUCLID    9 Euclidian division. q = sign(n) * floor(a / abs(n)).
    //             The remainder is always positive.
    //
    // The truncated division, floored division, Euclidian division and IEEE 754 remainder
    // modes are commonly used for the modulus operation.
    // Although the other rounding modes can also be used, they may not give useful results.
    MODULO_MODE = 1,                         // 0 to 9

    // The maximum number of significant digits of the result of the exponentiatedBy operation.
    // If POW_PRECISION is 0, there will be unlimited significant digits.
    POW_PRECISION = 0,                    // 0 to MAX

    // The format specification used by the BigNumber.prototype.toFormat method.
    FORMAT = {
      prefix: '',
      groupSize: 3,
      secondaryGroupSize: 0,
      groupSeparator: ',',
      decimalSeparator: '.',
      fractionGroupSize: 0,
      fractionGroupSeparator: '\xA0',      // non-breaking space
      suffix: ''
    },

    // The alphabet used for base conversion. It must be at least 2 characters long, with no '+',
    // '-', '.', whitespace, or repeated character.
    // '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_'
    ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';


  //------------------------------------------------------------------------------------------


  // CONSTRUCTOR


  /*
   * The BigNumber constructor and exported function.
   * Create and return a new instance of a BigNumber object.
   *
   * v {number|string|BigNumber} A numeric value.
   * [b] {number} The base of v. Integer, 2 to ALPHABET.length inclusive.
   */
  function BigNumber(v, b) {
    var alphabet, c, caseChanged, e, i, isNum, len, str,
      x = this;

    // Enable constructor call without `new`.
    if (!(x instanceof BigNumber)) return new BigNumber(v, b);

    if (b == null) {

      if (v && v._isBigNumber === true) {
        x.s = v.s;

        if (!v.c || v.e > MAX_EXP) {
          x.c = x.e = null;
        } else if (v.e < MIN_EXP) {
          x.c = [x.e = 0];
        } else {
          x.e = v.e;
          x.c = v.c.slice();
        }

        return;
      }

      if ((isNum = typeof v == 'number') && v * 0 == 0) {

        // Use `1 / n` to handle minus zero also.
        x.s = 1 / v < 0 ? (v = -v, -1) : 1;

        // Fast path for integers, where n < 2147483648 (2**31).
        if (v === ~~v) {
          for (e = 0, i = v; i >= 10; i /= 10, e++);

          if (e > MAX_EXP) {
            x.c = x.e = null;
          } else {
            x.e = e;
            x.c = [v];
          }

          return;
        }

        str = String(v);
      } else {

        if (!isNumeric.test(str = String(v))) return parseNumeric(x, str, isNum);

        x.s = str.charCodeAt(0) == 45 ? (str = str.slice(1), -1) : 1;
      }

      // Decimal point?
      if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');

      // Exponential form?
      if ((i = str.search(/e/i)) > 0) {

        // Determine exponent.
        if (e < 0) e = i;
        e += +str.slice(i + 1);
        str = str.substring(0, i);
      } else if (e < 0) {

        // Integer.
        e = str.length;
      }

    } else {

      // '[BigNumber Error] Base {not a primitive number|not an integer|out of range}: {b}'
      intCheck(b, 2, ALPHABET.length, 'Base');

      // Allow exponential notation to be used with base 10 argument, while
      // also rounding to DECIMAL_PLACES as with other bases.
      if (b == 10) {
        x = new BigNumber(v);
        return round(x, DECIMAL_PLACES + x.e + 1, ROUNDING_MODE);
      }

      str = String(v);

      if (isNum = typeof v == 'number') {

        // Avoid potential interpretation of Infinity and NaN as base 44+ values.
        if (v * 0 != 0) return parseNumeric(x, str, isNum, b);

        x.s = 1 / v < 0 ? (str = str.slice(1), -1) : 1;

        // '[BigNumber Error] Number primitive has more than 15 significant digits: {n}'
        if (BigNumber.DEBUG && str.replace(/^0\.0*|\./, '').length > 15) {
          throw Error
           (tooManyDigits + v);
        }
      } else {
        x.s = str.charCodeAt(0) === 45 ? (str = str.slice(1), -1) : 1;
      }

      alphabet = ALPHABET.slice(0, b);
      e = i = 0;

      // Check that str is a valid base b number.
      // Don't use RegExp, so alphabet can contain special characters.
      for (len = str.length; i < len; i++) {
        if (alphabet.indexOf(c = str.charAt(i)) < 0) {
          if (c == '.') {

            // If '.' is not the first character and it has not be found before.
            if (i > e) {
              e = len;
              continue;
            }
          } else if (!caseChanged) {

            // Allow e.g. hexadecimal 'FF' as well as 'ff'.
            if (str == str.toUpperCase() && (str = str.toLowerCase()) ||
                str == str.toLowerCase() && (str = str.toUpperCase())) {
              caseChanged = true;
              i = -1;
              e = 0;
              continue;
            }
          }

          return parseNumeric(x, String(v), isNum, b);
        }
      }

      // Prevent later check for length on converted number.
      isNum = false;
      str = convertBase(str, b, 10, x.s);

      // Decimal point?
      if ((e = str.indexOf('.')) > -1) str = str.replace('.', '');
      else e = str.length;
    }

    // Determine leading zeros.
    for (i = 0; str.charCodeAt(i) === 48; i++);

    // Determine trailing zeros.
    for (len = str.length; str.charCodeAt(--len) === 48;);

    if (str = str.slice(i, ++len)) {
      len -= i;

      // '[BigNumber Error] Number primitive has more than 15 significant digits: {n}'
      if (isNum && BigNumber.DEBUG &&
        len > 15 && (v > MAX_SAFE_INTEGER || v !== mathfloor(v))) {
          throw Error
           (tooManyDigits + (x.s * v));
      }

       // Overflow?
      if ((e = e - i - 1) > MAX_EXP) {

        // Infinity.
        x.c = x.e = null;

      // Underflow?
      } else if (e < MIN_EXP) {

        // Zero.
        x.c = [x.e = 0];
      } else {
        x.e = e;
        x.c = [];

        // Transform base

        // e is the base 10 exponent.
        // i is where to slice str to get the first element of the coefficient array.
        i = (e + 1) % LOG_BASE;
        if (e < 0) i += LOG_BASE;  // i < 1

        if (i < len) {
          if (i) x.c.push(+str.slice(0, i));

          for (len -= LOG_BASE; i < len;) {
            x.c.push(+str.slice(i, i += LOG_BASE));
          }

          i = LOG_BASE - (str = str.slice(i)).length;
        } else {
          i -= len;
        }

        for (; i--; str += '0');
        x.c.push(+str);
      }
    } else {

      // Zero.
      x.c = [x.e = 0];
    }
  }


  // CONSTRUCTOR PROPERTIES


  BigNumber.clone = clone;

  BigNumber.ROUND_UP = 0;
  BigNumber.ROUND_DOWN = 1;
  BigNumber.ROUND_CEIL = 2;
  BigNumber.ROUND_FLOOR = 3;
  BigNumber.ROUND_HALF_UP = 4;
  BigNumber.ROUND_HALF_DOWN = 5;
  BigNumber.ROUND_HALF_EVEN = 6;
  BigNumber.ROUND_HALF_CEIL = 7;
  BigNumber.ROUND_HALF_FLOOR = 8;
  BigNumber.EUCLID = 9;


  /*
   * Configure infrequently-changing library-wide settings.
   *
   * Accept an object with the following optional properties (if the value of a property is
   * a number, it must be an integer within the inclusive range stated):
   *
   *   DECIMAL_PLACES   {number}           0 to MAX
   *   ROUNDING_MODE    {number}           0 to 8
   *   EXPONENTIAL_AT   {number|number[]}  -MAX to MAX  or  [-MAX to 0, 0 to MAX]
   *   RANGE            {number|number[]}  -MAX to MAX (not zero)  or  [-MAX to -1, 1 to MAX]
   *   CRYPTO           {boolean}          true or false
   *   MODULO_MODE      {number}           0 to 9
   *   POW_PRECISION       {number}           0 to MAX
   *   ALPHABET         {string}           A string of two or more unique characters which does
   *                                     not contain '.'.
   *   FORMAT           {object}           An object with some of the following properties:
   *     prefix                 {string}
   *     groupSize              {number}
   *     secondaryGroupSize     {number}
   *     groupSeparator         {string}
   *     decimalSeparator       {string}
   *     fractionGroupSize      {number}
   *     fractionGroupSeparator {string}
   *     suffix                 {string}
   *
   * (The values assigned to the above FORMAT object properties are not checked for validity.)
   *
   * E.g.
   * BigNumber.config({ DECIMAL_PLACES : 20, ROUNDING_MODE : 4 })
   *
   * Ignore properties/parameters set to null or undefined, except for ALPHABET.
   *
   * Return an object with the properties current values.
   */
  BigNumber.config = BigNumber.set = function (obj) {
    var p, v;

    if (obj != null) {

      if (typeof obj == 'object') {

        // DECIMAL_PLACES {number} Integer, 0 to MAX inclusive.
        // '[BigNumber Error] DECIMAL_PLACES {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'DECIMAL_PLACES')) {
          v = obj[p];
          intCheck(v, 0, MAX, p);
          DECIMAL_PLACES = v;
        }

        // ROUNDING_MODE {number} Integer, 0 to 8 inclusive.
        // '[BigNumber Error] ROUNDING_MODE {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'ROUNDING_MODE')) {
          v = obj[p];
          intCheck(v, 0, 8, p);
          ROUNDING_MODE = v;
        }

        // EXPONENTIAL_AT {number|number[]}
        // Integer, -MAX to MAX inclusive or
        // [integer -MAX to 0 inclusive, 0 to MAX inclusive].
        // '[BigNumber Error] EXPONENTIAL_AT {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'EXPONENTIAL_AT')) {
          v = obj[p];
          if (v && v.pop) {
            intCheck(v[0], -MAX, 0, p);
            intCheck(v[1], 0, MAX, p);
            TO_EXP_NEG = v[0];
            TO_EXP_POS = v[1];
          } else {
            intCheck(v, -MAX, MAX, p);
            TO_EXP_NEG = -(TO_EXP_POS = v < 0 ? -v : v);
          }
        }

        // RANGE {number|number[]} Non-zero integer, -MAX to MAX inclusive or
        // [integer -MAX to -1 inclusive, integer 1 to MAX inclusive].
        // '[BigNumber Error] RANGE {not a primitive number|not an integer|out of range|cannot be zero}: {v}'
        if (obj.hasOwnProperty(p = 'RANGE')) {
          v = obj[p];
          if (v && v.pop) {
            intCheck(v[0], -MAX, -1, p);
            intCheck(v[1], 1, MAX, p);
            MIN_EXP = v[0];
            MAX_EXP = v[1];
          } else {
            intCheck(v, -MAX, MAX, p);
            if (v) {
              MIN_EXP = -(MAX_EXP = v < 0 ? -v : v);
            } else {
              throw Error
               (bignumberError + p + ' cannot be zero: ' + v);
            }
          }
        }

        // CRYPTO {boolean} true or false.
        // '[BigNumber Error] CRYPTO not true or false: {v}'
        // '[BigNumber Error] crypto unavailable'
        if (obj.hasOwnProperty(p = 'CRYPTO')) {
          v = obj[p];
          if (v === !!v) {
            if (v) {
              if (typeof crypto != 'undefined' && crypto &&
               (crypto.getRandomValues || crypto.randomBytes)) {
                CRYPTO = v;
              } else {
                CRYPTO = !v;
                throw Error
                 (bignumberError + 'crypto unavailable');
              }
            } else {
              CRYPTO = v;
            }
          } else {
            throw Error
             (bignumberError + p + ' not true or false: ' + v);
          }
        }

        // MODULO_MODE {number} Integer, 0 to 9 inclusive.
        // '[BigNumber Error] MODULO_MODE {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'MODULO_MODE')) {
          v = obj[p];
          intCheck(v, 0, 9, p);
          MODULO_MODE = v;
        }

        // POW_PRECISION {number} Integer, 0 to MAX inclusive.
        // '[BigNumber Error] POW_PRECISION {not a primitive number|not an integer|out of range}: {v}'
        if (obj.hasOwnProperty(p = 'POW_PRECISION')) {
          v = obj[p];
          intCheck(v, 0, MAX, p);
          POW_PRECISION = v;
        }

        // FORMAT {object}
        // '[BigNumber Error] FORMAT not an object: {v}'
        if (obj.hasOwnProperty(p = 'FORMAT')) {
          v = obj[p];
          if (typeof v == 'object') FORMAT = v;
          else throw Error
           (bignumberError + p + ' not an object: ' + v);
        }

        // ALPHABET {string}
        // '[BigNumber Error] ALPHABET invalid: {v}'
        if (obj.hasOwnProperty(p = 'ALPHABET')) {
          v = obj[p];

          // Disallow if only one character,
          // or if it contains '+', '-', '.', whitespace, or a repeated character.
          if (typeof v == 'string' && !/^.$|[+-.\s]|(.).*\1/.test(v)) {
            ALPHABET = v;
          } else {
            throw Error
             (bignumberError + p + ' invalid: ' + v);
          }
        }

      } else {

        // '[BigNumber Error] Object expected: {v}'
        throw Error
         (bignumberError + 'Object expected: ' + obj);
      }
    }

    return {
      DECIMAL_PLACES: DECIMAL_PLACES,
      ROUNDING_MODE: ROUNDING_MODE,
      EXPONENTIAL_AT: [TO_EXP_NEG, TO_EXP_POS],
      RANGE: [MIN_EXP, MAX_EXP],
      CRYPTO: CRYPTO,
      MODULO_MODE: MODULO_MODE,
      POW_PRECISION: POW_PRECISION,
      FORMAT: FORMAT,
      ALPHABET: ALPHABET
    };
  };


  /*
   * Return true if v is a BigNumber instance, otherwise return false.
   *
   * If BigNumber.DEBUG is true, throw if a BigNumber instance is not well-formed.
   *
   * v {any}
   *
   * '[BigNumber Error] Invalid BigNumber: {v}'
   */
  BigNumber.isBigNumber = function (v) {
    if (!v || v._isBigNumber !== true) return false;
    if (!BigNumber.DEBUG) return true;

    var i, n,
      c = v.c,
      e = v.e,
      s = v.s;

    out: if ({}.toString.call(c) == '[object Array]') {

      if ((s === 1 || s === -1) && e >= -MAX && e <= MAX && e === mathfloor(e)) {

        // If the first element is zero, the BigNumber value must be zero.
        if (c[0] === 0) {
          if (e === 0 && c.length === 1) return true;
          break out;
        }

        // Calculate number of digits that c[0] should have, based on the exponent.
        i = (e + 1) % LOG_BASE;
        if (i < 1) i += LOG_BASE;

        // Calculate number of digits of c[0].
        //if (Math.ceil(Math.log(c[0] + 1) / Math.LN10) == i) {
        if (String(c[0]).length == i) {

          for (i = 0; i < c.length; i++) {
            n = c[i];
            if (n < 0 || n >= BASE || n !== mathfloor(n)) break out;
          }

          // Last element cannot be zero, unless it is the only element.
          if (n !== 0) return true;
        }
      }

    // Infinity/NaN
    } else if (c === null && e === null && (s === null || s === 1 || s === -1)) {
      return true;
    }

    throw Error
      (bignumberError + 'Invalid BigNumber: ' + v);
  };


  /*
   * Return a new BigNumber whose value is the maximum of the arguments.
   *
   * arguments {number|string|BigNumber}
   */
  BigNumber.maximum = BigNumber.max = function () {
    return maxOrMin(arguments, P.lt);
  };


  /*
   * Return a new BigNumber whose value is the minimum of the arguments.
   *
   * arguments {number|string|BigNumber}
   */
  BigNumber.minimum = BigNumber.min = function () {
    return maxOrMin(arguments, P.gt);
  };


  /*
   * Return a new BigNumber with a random value equal to or greater than 0 and less than 1,
   * and with dp, or DECIMAL_PLACES if dp is omitted, decimal places (or less if trailing
   * zeros are produced).
   *
   * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp}'
   * '[BigNumber Error] crypto unavailable'
   */
  BigNumber.random = (function () {
    var pow2_53 = 0x20000000000000;

    // Return a 53 bit integer n, where 0 <= n < 9007199254740992.
    // Check if Math.random() produces more than 32 bits of randomness.
    // If it does, assume at least 53 bits are produced, otherwise assume at least 30 bits.
    // 0x40000000 is 2^30, 0x800000 is 2^23, 0x1fffff is 2^21 - 1.
    var random53bitInt = (Math.random() * pow2_53) & 0x1fffff
     ? function () { return mathfloor(Math.random() * pow2_53); }
     : function () { return ((Math.random() * 0x40000000 | 0) * 0x800000) +
       (Math.random() * 0x800000 | 0); };

    return function (dp) {
      var a, b, e, k, v,
        i = 0,
        c = [],
        rand = new BigNumber(ONE);

      if (dp == null) dp = DECIMAL_PLACES;
      else intCheck(dp, 0, MAX);

      k = mathceil(dp / LOG_BASE);

      if (CRYPTO) {

        // Browsers supporting crypto.getRandomValues.
        if (crypto.getRandomValues) {

          a = crypto.getRandomValues(new Uint32Array(k *= 2));

          for (; i < k;) {

            // 53 bits:
            // ((Math.pow(2, 32) - 1) * Math.pow(2, 21)).toString(2)
            // 11111 11111111 11111111 11111111 11100000 00000000 00000000
            // ((Math.pow(2, 32) - 1) >>> 11).toString(2)
            //                                     11111 11111111 11111111
            // 0x20000 is 2^21.
            v = a[i] * 0x20000 + (a[i + 1] >>> 11);

            // Rejection sampling:
            // 0 <= v < 9007199254740992
            // Probability that v >= 9e15, is
            // 7199254740992 / 9007199254740992 ~= 0.0008, i.e. 1 in 1251
            if (v >= 9e15) {
              b = crypto.getRandomValues(new Uint32Array(2));
              a[i] = b[0];
              a[i + 1] = b[1];
            } else {

              // 0 <= v <= 8999999999999999
              // 0 <= (v % 1e14) <= 99999999999999
              c.push(v % 1e14);
              i += 2;
            }
          }
          i = k / 2;

        // Node.js supporting crypto.randomBytes.
        } else if (crypto.randomBytes) {

          // buffer
          a = crypto.randomBytes(k *= 7);

          for (; i < k;) {

            // 0x1000000000000 is 2^48, 0x10000000000 is 2^40
            // 0x100000000 is 2^32, 0x1000000 is 2^24
            // 11111 11111111 11111111 11111111 11111111 11111111 11111111
            // 0 <= v < 9007199254740992
            v = ((a[i] & 31) * 0x1000000000000) + (a[i + 1] * 0x10000000000) +
               (a[i + 2] * 0x100000000) + (a[i + 3] * 0x1000000) +
               (a[i + 4] << 16) + (a[i + 5] << 8) + a[i + 6];

            if (v >= 9e15) {
              crypto.randomBytes(7).copy(a, i);
            } else {

              // 0 <= (v % 1e14) <= 99999999999999
              c.push(v % 1e14);
              i += 7;
            }
          }
          i = k / 7;
        } else {
          CRYPTO = false;
          throw Error
           (bignumberError + 'crypto unavailable');
        }
      }

      // Use Math.random.
      if (!CRYPTO) {

        for (; i < k;) {
          v = random53bitInt();
          if (v < 9e15) c[i++] = v % 1e14;
        }
      }

      k = c[--i];
      dp %= LOG_BASE;

      // Convert trailing digits to zeros according to dp.
      if (k && dp) {
        v = POWS_TEN[LOG_BASE - dp];
        c[i] = mathfloor(k / v) * v;
      }

      // Remove trailing elements which are zero.
      for (; c[i] === 0; c.pop(), i--);

      // Zero?
      if (i < 0) {
        c = [e = 0];
      } else {

        // Remove leading elements which are zero and adjust exponent accordingly.
        for (e = -1 ; c[0] === 0; c.splice(0, 1), e -= LOG_BASE);

        // Count the digits of the first element of c to determine leading zeros, and...
        for (i = 1, v = c[0]; v >= 10; v /= 10, i++);

        // adjust the exponent accordingly.
        if (i < LOG_BASE) e -= LOG_BASE - i;
      }

      rand.e = e;
      rand.c = c;
      return rand;
    };
  })();


   /*
   * Return a BigNumber whose value is the sum of the arguments.
   *
   * arguments {number|string|BigNumber}
   */
  BigNumber.sum = function () {
    var i = 1,
      args = arguments,
      sum = new BigNumber(args[0]);
    for (; i < args.length;) sum = sum.plus(args[i++]);
    return sum;
  };


  // PRIVATE FUNCTIONS


  // Called by BigNumber and BigNumber.prototype.toString.
  convertBase = (function () {
    var decimal = '0123456789';

    /*
     * Convert string of baseIn to an array of numbers of baseOut.
     * Eg. toBaseOut('255', 10, 16) returns [15, 15].
     * Eg. toBaseOut('ff', 16, 10) returns [2, 5, 5].
     */
    function toBaseOut(str, baseIn, baseOut, alphabet) {
      var j,
        arr = [0],
        arrL,
        i = 0,
        len = str.length;

      for (; i < len;) {
        for (arrL = arr.length; arrL--; arr[arrL] *= baseIn);

        arr[0] += alphabet.indexOf(str.charAt(i++));

        for (j = 0; j < arr.length; j++) {

          if (arr[j] > baseOut - 1) {
            if (arr[j + 1] == null) arr[j + 1] = 0;
            arr[j + 1] += arr[j] / baseOut | 0;
            arr[j] %= baseOut;
          }
        }
      }

      return arr.reverse();
    }

    // Convert a numeric string of baseIn to a numeric string of baseOut.
    // If the caller is toString, we are converting from base 10 to baseOut.
    // If the caller is BigNumber, we are converting from baseIn to base 10.
    return function (str, baseIn, baseOut, sign, callerIsToString) {
      var alphabet, d, e, k, r, x, xc, y,
        i = str.indexOf('.'),
        dp = DECIMAL_PLACES,
        rm = ROUNDING_MODE;

      // Non-integer.
      if (i >= 0) {
        k = POW_PRECISION;

        // Unlimited precision.
        POW_PRECISION = 0;
        str = str.replace('.', '');
        y = new BigNumber(baseIn);
        x = y.pow(str.length - i);
        POW_PRECISION = k;

        // Convert str as if an integer, then restore the fraction part by dividing the
        // result by its base raised to a power.

        y.c = toBaseOut(toFixedPoint(coeffToString(x.c), x.e, '0'),
         10, baseOut, decimal);
        y.e = y.c.length;
      }

      // Convert the number as integer.

      xc = toBaseOut(str, baseIn, baseOut, callerIsToString
       ? (alphabet = ALPHABET, decimal)
       : (alphabet = decimal, ALPHABET));

      // xc now represents str as an integer and converted to baseOut. e is the exponent.
      e = k = xc.length;

      // Remove trailing zeros.
      for (; xc[--k] == 0; xc.pop());

      // Zero?
      if (!xc[0]) return alphabet.charAt(0);

      // Does str represent an integer? If so, no need for the division.
      if (i < 0) {
        --e;
      } else {
        x.c = xc;
        x.e = e;

        // The sign is needed for correct rounding.
        x.s = sign;
        x = div(x, y, dp, rm, baseOut);
        xc = x.c;
        r = x.r;
        e = x.e;
      }

      // xc now represents str converted to baseOut.

      // THe index of the rounding digit.
      d = e + dp + 1;

      // The rounding digit: the digit to the right of the digit that may be rounded up.
      i = xc[d];

      // Look at the rounding digits and mode to determine whether to round up.

      k = baseOut / 2;
      r = r || d < 0 || xc[d + 1] != null;

      r = rm < 4 ? (i != null || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
            : i > k || i == k &&(rm == 4 || r || rm == 6 && xc[d - 1] & 1 ||
             rm == (x.s < 0 ? 8 : 7));

      // If the index of the rounding digit is not greater than zero, or xc represents
      // zero, then the result of the base conversion is zero or, if rounding up, a value
      // such as 0.00001.
      if (d < 1 || !xc[0]) {

        // 1^-dp or 0
        str = r ? toFixedPoint(alphabet.charAt(1), -dp, alphabet.charAt(0)) : alphabet.charAt(0);
      } else {

        // Truncate xc to the required number of decimal places.
        xc.length = d;

        // Round up?
        if (r) {

          // Rounding up may mean the previous digit has to be rounded up and so on.
          for (--baseOut; ++xc[--d] > baseOut;) {
            xc[d] = 0;

            if (!d) {
              ++e;
              xc = [1].concat(xc);
            }
          }
        }

        // Determine trailing zeros.
        for (k = xc.length; !xc[--k];);

        // E.g. [4, 11, 15] becomes 4bf.
        for (i = 0, str = ''; i <= k; str += alphabet.charAt(xc[i++]));

        // Add leading zeros, decimal point and trailing zeros as required.
        str = toFixedPoint(str, e, alphabet.charAt(0));
      }

      // The caller will add the sign.
      return str;
    };
  })();


  // Perform division in the specified base. Called by div and convertBase.
  div = (function () {

    // Assume non-zero x and k.
    function multiply(x, k, base) {
      var m, temp, xlo, xhi,
        carry = 0,
        i = x.length,
        klo = k % SQRT_BASE,
        khi = k / SQRT_BASE | 0;

      for (x = x.slice(); i--;) {
        xlo = x[i] % SQRT_BASE;
        xhi = x[i] / SQRT_BASE | 0;
        m = khi * xlo + xhi * klo;
        temp = klo * xlo + ((m % SQRT_BASE) * SQRT_BASE) + carry;
        carry = (temp / base | 0) + (m / SQRT_BASE | 0) + khi * xhi;
        x[i] = temp % base;
      }

      if (carry) x = [carry].concat(x);

      return x;
    }

    function compare(a, b, aL, bL) {
      var i, cmp;

      if (aL != bL) {
        cmp = aL > bL ? 1 : -1;
      } else {

        for (i = cmp = 0; i < aL; i++) {

          if (a[i] != b[i]) {
            cmp = a[i] > b[i] ? 1 : -1;
            break;
          }
        }
      }

      return cmp;
    }

    function subtract(a, b, aL, base) {
      var i = 0;

      // Subtract b from a.
      for (; aL--;) {
        a[aL] -= i;
        i = a[aL] < b[aL] ? 1 : 0;
        a[aL] = i * base + a[aL] - b[aL];
      }

      // Remove leading zeros.
      for (; !a[0] && a.length > 1; a.splice(0, 1));
    }

    // x: dividend, y: divisor.
    return function (x, y, dp, rm, base) {
      var cmp, e, i, more, n, prod, prodL, q, qc, rem, remL, rem0, xi, xL, yc0,
        yL, yz,
        s = x.s == y.s ? 1 : -1,
        xc = x.c,
        yc = y.c;

      // Either NaN, Infinity or 0?
      if (!xc || !xc[0] || !yc || !yc[0]) {

        return new BigNumber(

         // Return NaN if either NaN, or both Infinity or 0.
         !x.s || !y.s || (xc ? yc && xc[0] == yc[0] : !yc) ? NaN :

          // Return ±0 if x is ±0 or y is ±Infinity, or return ±Infinity as y is ±0.
          xc && xc[0] == 0 || !yc ? s * 0 : s / 0
       );
      }

      q = new BigNumber(s);
      qc = q.c = [];
      e = x.e - y.e;
      s = dp + e + 1;

      if (!base) {
        base = BASE;
        e = bitFloor(x.e / LOG_BASE) - bitFloor(y.e / LOG_BASE);
        s = s / LOG_BASE | 0;
      }

      // Result exponent may be one less then the current value of e.
      // The coefficients of the BigNumbers from convertBase may have trailing zeros.
      for (i = 0; yc[i] == (xc[i] || 0); i++);

      if (yc[i] > (xc[i] || 0)) e--;

      if (s < 0) {
        qc.push(1);
        more = true;
      } else {
        xL = xc.length;
        yL = yc.length;
        i = 0;
        s += 2;

        // Normalise xc and yc so highest order digit of yc is >= base / 2.

        n = mathfloor(base / (yc[0] + 1));

        // Not necessary, but to handle odd bases where yc[0] == (base / 2) - 1.
        // if (n > 1 || n++ == 1 && yc[0] < base / 2) {
        if (n > 1) {
          yc = multiply(yc, n, base);
          xc = multiply(xc, n, base);
          yL = yc.length;
          xL = xc.length;
        }

        xi = yL;
        rem = xc.slice(0, yL);
        remL = rem.length;

        // Add zeros to make remainder as long as divisor.
        for (; remL < yL; rem[remL++] = 0);
        yz = yc.slice();
        yz = [0].concat(yz);
        yc0 = yc[0];
        if (yc[1] >= base / 2) yc0++;
        // Not necessary, but to prevent trial digit n > base, when using base 3.
        // else if (base == 3 && yc0 == 1) yc0 = 1 + 1e-15;

        do {
          n = 0;

          // Compare divisor and remainder.
          cmp = compare(yc, rem, yL, remL);

          // If divisor < remainder.
          if (cmp < 0) {

            // Calculate trial digit, n.

            rem0 = rem[0];
            if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);

            // n is how many times the divisor goes into the current remainder.
            n = mathfloor(rem0 / yc0);

            //  Algorithm:
            //  product = divisor multiplied by trial digit (n).
            //  Compare product and remainder.
            //  If product is greater than remainder:
            //    Subtract divisor from product, decrement trial digit.
            //  Subtract product from remainder.
            //  If product was less than remainder at the last compare:
            //    Compare new remainder and divisor.
            //    If remainder is greater than divisor:
            //      Subtract divisor from remainder, increment trial digit.

            if (n > 1) {

              // n may be > base only when base is 3.
              if (n >= base) n = base - 1;

              // product = divisor * trial digit.
              prod = multiply(yc, n, base);
              prodL = prod.length;
              remL = rem.length;

              // Compare product and remainder.
              // If product > remainder then trial digit n too high.
              // n is 1 too high about 5% of the time, and is not known to have
              // ever been more than 1 too high.
              while (compare(prod, rem, prodL, remL) == 1) {
                n--;

                // Subtract divisor from product.
                subtract(prod, yL < prodL ? yz : yc, prodL, base);
                prodL = prod.length;
                cmp = 1;
              }
            } else {

              // n is 0 or 1, cmp is -1.
              // If n is 0, there is no need to compare yc and rem again below,
              // so change cmp to 1 to avoid it.
              // If n is 1, leave cmp as -1, so yc and rem are compared again.
              if (n == 0) {

                // divisor < remainder, so n must be at least 1.
                cmp = n = 1;
              }

              // product = divisor
              prod = yc.slice();
              prodL = prod.length;
            }

            if (prodL < remL) prod = [0].concat(prod);

            // Subtract product from remainder.
            subtract(rem, prod, remL, base);
            remL = rem.length;

             // If product was < remainder.
            if (cmp == -1) {

              // Compare divisor and new remainder.
              // If divisor < new remainder, subtract divisor from remainder.
              // Trial digit n too low.
              // n is 1 too low about 5% of the time, and very rarely 2 too low.
              while (compare(yc, rem, yL, remL) < 1) {
                n++;

                // Subtract divisor from remainder.
                subtract(rem, yL < remL ? yz : yc, remL, base);
                remL = rem.length;
              }
            }
          } else if (cmp === 0) {
            n++;
            rem = [0];
          } // else cmp === 1 and n will be 0

          // Add the next digit, n, to the result array.
          qc[i++] = n;

          // Update the remainder.
          if (rem[0]) {
            rem[remL++] = xc[xi] || 0;
          } else {
            rem = [xc[xi]];
            remL = 1;
          }
        } while ((xi++ < xL || rem[0] != null) && s--);

        more = rem[0] != null;

        // Leading zero?
        if (!qc[0]) qc.splice(0, 1);
      }

      if (base == BASE) {

        // To calculate q.e, first get the number of digits of qc[0].
        for (i = 1, s = qc[0]; s >= 10; s /= 10, i++);

        round(q, dp + (q.e = i + e * LOG_BASE - 1) + 1, rm, more);

      // Caller is convertBase.
      } else {
        q.e = e;
        q.r = +more;
      }

      return q;
    };
  })();


  /*
   * Return a string representing the value of BigNumber n in fixed-point or exponential
   * notation rounded to the specified decimal places or significant digits.
   *
   * n: a BigNumber.
   * i: the index of the last digit required (i.e. the digit that may be rounded up).
   * rm: the rounding mode.
   * id: 1 (toExponential) or 2 (toPrecision).
   */
  function format(n, i, rm, id) {
    var c0, e, ne, len, str;

    if (rm == null) rm = ROUNDING_MODE;
    else intCheck(rm, 0, 8);

    if (!n.c) return n.toString();

    c0 = n.c[0];
    ne = n.e;

    if (i == null) {
      str = coeffToString(n.c);
      str = id == 1 || id == 2 && (ne <= TO_EXP_NEG || ne >= TO_EXP_POS)
       ? toExponential(str, ne)
       : toFixedPoint(str, ne, '0');
    } else {
      n = round(new BigNumber(n), i, rm);

      // n.e may have changed if the value was rounded up.
      e = n.e;

      str = coeffToString(n.c);
      len = str.length;

      // toPrecision returns exponential notation if the number of significant digits
      // specified is less than the number of digits necessary to represent the integer
      // part of the value in fixed-point notation.

      // Exponential notation.
      if (id == 1 || id == 2 && (i <= e || e <= TO_EXP_NEG)) {

        // Append zeros?
        for (; len < i; str += '0', len++);
        str = toExponential(str, e);

      // Fixed-point notation.
      } else {
        i -= ne;
        str = toFixedPoint(str, e, '0');

        // Append zeros?
        if (e + 1 > len) {
          if (--i > 0) for (str += '.'; i--; str += '0');
        } else {
          i += e - len;
          if (i > 0) {
            if (e + 1 == len) str += '.';
            for (; i--; str += '0');
          }
        }
      }
    }

    return n.s < 0 && c0 ? '-' + str : str;
  }


  // Handle BigNumber.max and BigNumber.min.
  function maxOrMin(args, method) {
    var n,
      i = 1,
      m = new BigNumber(args[0]);

    for (; i < args.length; i++) {
      n = new BigNumber(args[i]);

      // If any number is NaN, return NaN.
      if (!n.s) {
        m = n;
        break;
      } else if (method.call(m, n)) {
        m = n;
      }
    }

    return m;
  }


  /*
   * Strip trailing zeros, calculate base 10 exponent and check against MIN_EXP and MAX_EXP.
   * Called by minus, plus and times.
   */
  function normalise(n, c, e) {
    var i = 1,
      j = c.length;

     // Remove trailing zeros.
    for (; !c[--j]; c.pop());

    // Calculate the base 10 exponent. First get the number of digits of c[0].
    for (j = c[0]; j >= 10; j /= 10, i++);

    // Overflow?
    if ((e = i + e * LOG_BASE - 1) > MAX_EXP) {

      // Infinity.
      n.c = n.e = null;

    // Underflow?
    } else if (e < MIN_EXP) {

      // Zero.
      n.c = [n.e = 0];
    } else {
      n.e = e;
      n.c = c;
    }

    return n;
  }


  // Handle values that fail the validity test in BigNumber.
  parseNumeric = (function () {
    var basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i,
      dotAfter = /^([^.]+)\.$/,
      dotBefore = /^\.([^.]+)$/,
      isInfinityOrNaN = /^-?(Infinity|NaN)$/,
      whitespaceOrPlus = /^\s*\+(?=[\w.])|^\s+|\s+$/g;

    return function (x, str, isNum, b) {
      var base,
        s = isNum ? str : str.replace(whitespaceOrPlus, '');

      // No exception on ±Infinity or NaN.
      if (isInfinityOrNaN.test(s)) {
        x.s = isNaN(s) ? null : s < 0 ? -1 : 1;
      } else {
        if (!isNum) {

          // basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i
          s = s.replace(basePrefix, function (m, p1, p2) {
            base = (p2 = p2.toLowerCase()) == 'x' ? 16 : p2 == 'b' ? 2 : 8;
            return !b || b == base ? p1 : m;
          });

          if (b) {
            base = b;

            // E.g. '1.' to '1', '.1' to '0.1'
            s = s.replace(dotAfter, '$1').replace(dotBefore, '0.$1');
          }

          if (str != s) return new BigNumber(s, base);
        }

        // '[BigNumber Error] Not a number: {n}'
        // '[BigNumber Error] Not a base {b} number: {n}'
        if (BigNumber.DEBUG) {
          throw Error
            (bignumberError + 'Not a' + (b ? ' base ' + b : '') + ' number: ' + str);
        }

        // NaN
        x.s = null;
      }

      x.c = x.e = null;
    }
  })();


  /*
   * Round x to sd significant digits using rounding mode rm. Check for over/under-flow.
   * If r is truthy, it is known that there are more digits after the rounding digit.
   */
  function round(x, sd, rm, r) {
    var d, i, j, k, n, ni, rd,
      xc = x.c,
      pows10 = POWS_TEN;

    // if x is not Infinity or NaN...
    if (xc) {

      // rd is the rounding digit, i.e. the digit after the digit that may be rounded up.
      // n is a base 1e14 number, the value of the element of array x.c containing rd.
      // ni is the index of n within x.c.
      // d is the number of digits of n.
      // i is the index of rd within n including leading zeros.
      // j is the actual index of rd within n (if < 0, rd is a leading zero).
      out: {

        // Get the number of digits of the first element of xc.
        for (d = 1, k = xc[0]; k >= 10; k /= 10, d++);
        i = sd - d;

        // If the rounding digit is in the first element of xc...
        if (i < 0) {
          i += LOG_BASE;
          j = sd;
          n = xc[ni = 0];

          // Get the rounding digit at index j of n.
          rd = n / pows10[d - j - 1] % 10 | 0;
        } else {
          ni = mathceil((i + 1) / LOG_BASE);

          if (ni >= xc.length) {

            if (r) {

              // Needed by sqrt.
              for (; xc.length <= ni; xc.push(0));
              n = rd = 0;
              d = 1;
              i %= LOG_BASE;
              j = i - LOG_BASE + 1;
            } else {
              break out;
            }
          } else {
            n = k = xc[ni];

            // Get the number of digits of n.
            for (d = 1; k >= 10; k /= 10, d++);

            // Get the index of rd within n.
            i %= LOG_BASE;

            // Get the index of rd within n, adjusted for leading zeros.
            // The number of leading zeros of n is given by LOG_BASE - d.
            j = i - LOG_BASE + d;

            // Get the rounding digit at index j of n.
            rd = j < 0 ? 0 : n / pows10[d - j - 1] % 10 | 0;
          }
        }

        r = r || sd < 0 ||

        // Are there any non-zero digits after the rounding digit?
        // The expression  n % pows10[d - j - 1]  returns all digits of n to the right
        // of the digit at j, e.g. if n is 908714 and j is 2, the expression gives 714.
         xc[ni + 1] != null || (j < 0 ? n : n % pows10[d - j - 1]);

        r = rm < 4
         ? (rd || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2))
         : rd > 5 || rd == 5 && (rm == 4 || r || rm == 6 &&

          // Check whether the digit to the left of the rounding digit is odd.
          ((i > 0 ? j > 0 ? n / pows10[d - j] : 0 : xc[ni - 1]) % 10) & 1 ||
           rm == (x.s < 0 ? 8 : 7));

        if (sd < 1 || !xc[0]) {
          xc.length = 0;

          if (r) {

            // Convert sd to decimal places.
            sd -= x.e + 1;

            // 1, 0.1, 0.01, 0.001, 0.0001 etc.
            xc[0] = pows10[(LOG_BASE - sd % LOG_BASE) % LOG_BASE];
            x.e = -sd || 0;
          } else {

            // Zero.
            xc[0] = x.e = 0;
          }

          return x;
        }

        // Remove excess digits.
        if (i == 0) {
          xc.length = ni;
          k = 1;
          ni--;
        } else {
          xc.length = ni + 1;
          k = pows10[LOG_BASE - i];

          // E.g. 56700 becomes 56000 if 7 is the rounding digit.
          // j > 0 means i > number of leading zeros of n.
          xc[ni] = j > 0 ? mathfloor(n / pows10[d - j] % pows10[j]) * k : 0;
        }

        // Round up?
        if (r) {

          for (; ;) {

            // If the digit to be rounded up is in the first element of xc...
            if (ni == 0) {

              // i will be the length of xc[0] before k is added.
              for (i = 1, j = xc[0]; j >= 10; j /= 10, i++);
              j = xc[0] += k;
              for (k = 1; j >= 10; j /= 10, k++);

              // if i != k the length has increased.
              if (i != k) {
                x.e++;
                if (xc[0] == BASE) xc[0] = 1;
              }

              break;
            } else {
              xc[ni] += k;
              if (xc[ni] != BASE) break;
              xc[ni--] = 0;
              k = 1;
            }
          }
        }

        // Remove trailing zeros.
        for (i = xc.length; xc[--i] === 0; xc.pop());
      }

      // Overflow? Infinity.
      if (x.e > MAX_EXP) {
        x.c = x.e = null;

      // Underflow? Zero.
      } else if (x.e < MIN_EXP) {
        x.c = [x.e = 0];
      }
    }

    return x;
  }


  function valueOf(n) {
    var str,
      e = n.e;

    if (e === null) return n.toString();

    str = coeffToString(n.c);

    str = e <= TO_EXP_NEG || e >= TO_EXP_POS
      ? toExponential(str, e)
      : toFixedPoint(str, e, '0');

    return n.s < 0 ? '-' + str : str;
  }


  // PROTOTYPE/INSTANCE METHODS


  /*
   * Return a new BigNumber whose value is the absolute value of this BigNumber.
   */
  P.absoluteValue = P.abs = function () {
    var x = new BigNumber(this);
    if (x.s < 0) x.s = 1;
    return x;
  };


  /*
   * Return
   *   1 if the value of this BigNumber is greater than the value of BigNumber(y, b),
   *   -1 if the value of this BigNumber is less than the value of BigNumber(y, b),
   *   0 if they have the same value,
   *   or null if the value of either is NaN.
   */
  P.comparedTo = function (y, b) {
    return compare(this, new BigNumber(y, b));
  };


  /*
   * If dp is undefined or null or true or false, return the number of decimal places of the
   * value of this BigNumber, or null if the value of this BigNumber is ±Infinity or NaN.
   *
   * Otherwise, if dp is a number, return a new BigNumber whose value is the value of this
   * BigNumber rounded to a maximum of dp decimal places using rounding mode rm, or
   * ROUNDING_MODE if rm is omitted.
   *
   * [dp] {number} Decimal places: integer, 0 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
   */
  P.decimalPlaces = P.dp = function (dp, rm) {
    var c, n, v,
      x = this;

    if (dp != null) {
      intCheck(dp, 0, MAX);
      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);

      return round(new BigNumber(x), dp + x.e + 1, rm);
    }

    if (!(c = x.c)) return null;
    n = ((v = c.length - 1) - bitFloor(this.e / LOG_BASE)) * LOG_BASE;

    // Subtract the number of trailing zeros of the last number.
    if (v = c[v]) for (; v % 10 == 0; v /= 10, n--);
    if (n < 0) n = 0;

    return n;
  };


  /*
   *  n / 0 = I
   *  n / N = N
   *  n / I = 0
   *  0 / n = 0
   *  0 / 0 = N
   *  0 / N = N
   *  0 / I = 0
   *  N / n = N
   *  N / 0 = N
   *  N / N = N
   *  N / I = N
   *  I / n = I
   *  I / 0 = I
   *  I / N = N
   *  I / I = N
   *
   * Return a new BigNumber whose value is the value of this BigNumber divided by the value of
   * BigNumber(y, b), rounded according to DECIMAL_PLACES and ROUNDING_MODE.
   */
  P.dividedBy = P.div = function (y, b) {
    return div(this, new BigNumber(y, b), DECIMAL_PLACES, ROUNDING_MODE);
  };


  /*
   * Return a new BigNumber whose value is the integer part of dividing the value of this
   * BigNumber by the value of BigNumber(y, b).
   */
  P.dividedToIntegerBy = P.idiv = function (y, b) {
    return div(this, new BigNumber(y, b), 0, 1);
  };


  /*
   * Return a BigNumber whose value is the value of this BigNumber exponentiated by n.
   *
   * If m is present, return the result modulo m.
   * If n is negative round according to DECIMAL_PLACES and ROUNDING_MODE.
   * If POW_PRECISION is non-zero and m is not present, round to POW_PRECISION using ROUNDING_MODE.
   *
   * The modular power operation works efficiently when x, n, and m are integers, otherwise it
   * is equivalent to calculating x.exponentiatedBy(n).modulo(m) with a POW_PRECISION of 0.
   *
   * n {number|string|BigNumber} The exponent. An integer.
   * [m] {number|string|BigNumber} The modulus.
   *
   * '[BigNumber Error] Exponent not an integer: {n}'
   */
  P.exponentiatedBy = P.pow = function (n, m) {
    var half, isModExp, i, k, more, nIsBig, nIsNeg, nIsOdd, y,
      x = this;

    n = new BigNumber(n);

    // Allow NaN and ±Infinity, but not other non-integers.
    if (n.c && !n.isInteger()) {
      throw Error
        (bignumberError + 'Exponent not an integer: ' + valueOf(n));
    }

    if (m != null) m = new BigNumber(m);

    // Exponent of MAX_SAFE_INTEGER is 15.
    nIsBig = n.e > 14;

    // If x is NaN, ±Infinity, ±0 or ±1, or n is ±Infinity, NaN or ±0.
    if (!x.c || !x.c[0] || x.c[0] == 1 && !x.e && x.c.length == 1 || !n.c || !n.c[0]) {

      // The sign of the result of pow when x is negative depends on the evenness of n.
      // If +n overflows to ±Infinity, the evenness of n would be not be known.
      y = new BigNumber(Math.pow(+valueOf(x), nIsBig ? 2 - isOdd(n) : +valueOf(n)));
      return m ? y.mod(m) : y;
    }

    nIsNeg = n.s < 0;

    if (m) {

      // x % m returns NaN if abs(m) is zero, or m is NaN.
      if (m.c ? !m.c[0] : !m.s) return new BigNumber(NaN);

      isModExp = !nIsNeg && x.isInteger() && m.isInteger();

      if (isModExp) x = x.mod(m);

    // Overflow to ±Infinity: >=2**1e10 or >=1.0000024**1e15.
    // Underflow to ±0: <=0.79**1e10 or <=0.9999975**1e15.
    } else if (n.e > 9 && (x.e > 0 || x.e < -1 || (x.e == 0
      // [1, 240000000]
      ? x.c[0] > 1 || nIsBig && x.c[1] >= 24e7
      // [80000000000000]  [99999750000000]
      : x.c[0] < 8e13 || nIsBig && x.c[0] <= 9999975e7))) {

      // If x is negative and n is odd, k = -0, else k = 0.
      k = x.s < 0 && isOdd(n) ? -0 : 0;

      // If x >= 1, k = ±Infinity.
      if (x.e > -1) k = 1 / k;

      // If n is negative return ±0, else return ±Infinity.
      return new BigNumber(nIsNeg ? 1 / k : k);

    } else if (POW_PRECISION) {

      // Truncating each coefficient array to a length of k after each multiplication
      // equates to truncating significant digits to POW_PRECISION + [28, 41],
      // i.e. there will be a minimum of 28 guard digits retained.
      k = mathceil(POW_PRECISION / LOG_BASE + 2);
    }

    if (nIsBig) {
      half = new BigNumber(0.5);
      if (nIsNeg) n.s = 1;
      nIsOdd = isOdd(n);
    } else {
      i = Math.abs(+valueOf(n));
      nIsOdd = i % 2;
    }

    y = new BigNumber(ONE);

    // Performs 54 loop iterations for n of 9007199254740991.
    for (; ;) {

      if (nIsOdd) {
        y = y.times(x);
        if (!y.c) break;

        if (k) {
          if (y.c.length > k) y.c.length = k;
        } else if (isModExp) {
          y = y.mod(m);    //y = y.minus(div(y, m, 0, MODULO_MODE).times(m));
        }
      }

      if (i) {
        i = mathfloor(i / 2);
        if (i === 0) break;
        nIsOdd = i % 2;
      } else {
        n = n.times(half);
        round(n, n.e + 1, 1);

        if (n.e > 14) {
          nIsOdd = isOdd(n);
        } else {
          i = +valueOf(n);
          if (i === 0) break;
          nIsOdd = i % 2;
        }
      }

      x = x.times(x);

      if (k) {
        if (x.c && x.c.length > k) x.c.length = k;
      } else if (isModExp) {
        x = x.mod(m);    //x = x.minus(div(x, m, 0, MODULO_MODE).times(m));
      }
    }

    if (isModExp) return y;
    if (nIsNeg) y = ONE.div(y);

    return m ? y.mod(m) : k ? round(y, POW_PRECISION, ROUNDING_MODE, more) : y;
  };


  /*
   * Return a new BigNumber whose value is the value of this BigNumber rounded to an integer
   * using rounding mode rm, or ROUNDING_MODE if rm is omitted.
   *
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {rm}'
   */
  P.integerValue = function (rm) {
    var n = new BigNumber(this);
    if (rm == null) rm = ROUNDING_MODE;
    else intCheck(rm, 0, 8);
    return round(n, n.e + 1, rm);
  };


  /*
   * Return true if the value of this BigNumber is equal to the value of BigNumber(y, b),
   * otherwise return false.
   */
  P.isEqualTo = P.eq = function (y, b) {
    return compare(this, new BigNumber(y, b)) === 0;
  };


  /*
   * Return true if the value of this BigNumber is a finite number, otherwise return false.
   */
  P.isFinite = function () {
    return !!this.c;
  };


  /*
   * Return true if the value of this BigNumber is greater than the value of BigNumber(y, b),
   * otherwise return false.
   */
  P.isGreaterThan = P.gt = function (y, b) {
    return compare(this, new BigNumber(y, b)) > 0;
  };


  /*
   * Return true if the value of this BigNumber is greater than or equal to the value of
   * BigNumber(y, b), otherwise return false.
   */
  P.isGreaterThanOrEqualTo = P.gte = function (y, b) {
    return (b = compare(this, new BigNumber(y, b))) === 1 || b === 0;

  };


  /*
   * Return true if the value of this BigNumber is an integer, otherwise return false.
   */
  P.isInteger = function () {
    return !!this.c && bitFloor(this.e / LOG_BASE) > this.c.length - 2;
  };


  /*
   * Return true if the value of this BigNumber is less than the value of BigNumber(y, b),
   * otherwise return false.
   */
  P.isLessThan = P.lt = function (y, b) {
    return compare(this, new BigNumber(y, b)) < 0;
  };


  /*
   * Return true if the value of this BigNumber is less than or equal to the value of
   * BigNumber(y, b), otherwise return false.
   */
  P.isLessThanOrEqualTo = P.lte = function (y, b) {
    return (b = compare(this, new BigNumber(y, b))) === -1 || b === 0;
  };


  /*
   * Return true if the value of this BigNumber is NaN, otherwise return false.
   */
  P.isNaN = function () {
    return !this.s;
  };


  /*
   * Return true if the value of this BigNumber is negative, otherwise return false.
   */
  P.isNegative = function () {
    return this.s < 0;
  };


  /*
   * Return true if the value of this BigNumber is positive, otherwise return false.
   */
  P.isPositive = function () {
    return this.s > 0;
  };


  /*
   * Return true if the value of this BigNumber is 0 or -0, otherwise return false.
   */
  P.isZero = function () {
    return !!this.c && this.c[0] == 0;
  };


  /*
   *  n - 0 = n
   *  n - N = N
   *  n - I = -I
   *  0 - n = -n
   *  0 - 0 = 0
   *  0 - N = N
   *  0 - I = -I
   *  N - n = N
   *  N - 0 = N
   *  N - N = N
   *  N - I = N
   *  I - n = I
   *  I - 0 = I
   *  I - N = N
   *  I - I = N
   *
   * Return a new BigNumber whose value is the value of this BigNumber minus the value of
   * BigNumber(y, b).
   */
  P.minus = function (y, b) {
    var i, j, t, xLTy,
      x = this,
      a = x.s;

    y = new BigNumber(y, b);
    b = y.s;

    // Either NaN?
    if (!a || !b) return new BigNumber(NaN);

    // Signs differ?
    if (a != b) {
      y.s = -b;
      return x.plus(y);
    }

    var xe = x.e / LOG_BASE,
      ye = y.e / LOG_BASE,
      xc = x.c,
      yc = y.c;

    if (!xe || !ye) {

      // Either Infinity?
      if (!xc || !yc) return xc ? (y.s = -b, y) : new BigNumber(yc ? x : NaN);

      // Either zero?
      if (!xc[0] || !yc[0]) {

        // Return y if y is non-zero, x if x is non-zero, or zero if both are zero.
        return yc[0] ? (y.s = -b, y) : new BigNumber(xc[0] ? x :

         // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
         ROUNDING_MODE == 3 ? -0 : 0);
      }
    }

    xe = bitFloor(xe);
    ye = bitFloor(ye);
    xc = xc.slice();

    // Determine which is the bigger number.
    if (a = xe - ye) {

      if (xLTy = a < 0) {
        a = -a;
        t = xc;
      } else {
        ye = xe;
        t = yc;
      }

      t.reverse();

      // Prepend zeros to equalise exponents.
      for (b = a; b--; t.push(0));
      t.reverse();
    } else {

      // Exponents equal. Check digit by digit.
      j = (xLTy = (a = xc.length) < (b = yc.length)) ? a : b;

      for (a = b = 0; b < j; b++) {

        if (xc[b] != yc[b]) {
          xLTy = xc[b] < yc[b];
          break;
        }
      }
    }

    // x < y? Point xc to the array of the bigger number.
    if (xLTy) t = xc, xc = yc, yc = t, y.s = -y.s;

    b = (j = yc.length) - (i = xc.length);

    // Append zeros to xc if shorter.
    // No need to add zeros to yc if shorter as subtract only needs to start at yc.length.
    if (b > 0) for (; b--; xc[i++] = 0);
    b = BASE - 1;

    // Subtract yc from xc.
    for (; j > a;) {

      if (xc[--j] < yc[j]) {
        for (i = j; i && !xc[--i]; xc[i] = b);
        --xc[i];
        xc[j] += BASE;
      }

      xc[j] -= yc[j];
    }

    // Remove leading zeros and adjust exponent accordingly.
    for (; xc[0] == 0; xc.splice(0, 1), --ye);

    // Zero?
    if (!xc[0]) {

      // Following IEEE 754 (2008) 6.3,
      // n - n = +0  but  n - n = -0  when rounding towards -Infinity.
      y.s = ROUNDING_MODE == 3 ? -1 : 1;
      y.c = [y.e = 0];
      return y;
    }

    // No need to check for Infinity as +x - +y != Infinity && -x - -y != Infinity
    // for finite x and y.
    return normalise(y, xc, ye);
  };


  /*
   *   n % 0 =  N
   *   n % N =  N
   *   n % I =  n
   *   0 % n =  0
   *  -0 % n = -0
   *   0 % 0 =  N
   *   0 % N =  N
   *   0 % I =  0
   *   N % n =  N
   *   N % 0 =  N
   *   N % N =  N
   *   N % I =  N
   *   I % n =  N
   *   I % 0 =  N
   *   I % N =  N
   *   I % I =  N
   *
   * Return a new BigNumber whose value is the value of this BigNumber modulo the value of
   * BigNumber(y, b). The result depends on the value of MODULO_MODE.
   */
  P.modulo = P.mod = function (y, b) {
    var q, s,
      x = this;

    y = new BigNumber(y, b);

    // Return NaN if x is Infinity or NaN, or y is NaN or zero.
    if (!x.c || !y.s || y.c && !y.c[0]) {
      return new BigNumber(NaN);

    // Return x if y is Infinity or x is zero.
    } else if (!y.c || x.c && !x.c[0]) {
      return new BigNumber(x);
    }

    if (MODULO_MODE == 9) {

      // Euclidian division: q = sign(y) * floor(x / abs(y))
      // r = x - qy    where  0 <= r < abs(y)
      s = y.s;
      y.s = 1;
      q = div(x, y, 0, 3);
      y.s = s;
      q.s *= s;
    } else {
      q = div(x, y, 0, MODULO_MODE);
    }

    y = x.minus(q.times(y));

    // To match JavaScript %, ensure sign of zero is sign of dividend.
    if (!y.c[0] && MODULO_MODE == 1) y.s = x.s;

    return y;
  };


  /*
   *  n * 0 = 0
   *  n * N = N
   *  n * I = I
   *  0 * n = 0
   *  0 * 0 = 0
   *  0 * N = N
   *  0 * I = N
   *  N * n = N
   *  N * 0 = N
   *  N * N = N
   *  N * I = N
   *  I * n = I
   *  I * 0 = N
   *  I * N = N
   *  I * I = I
   *
   * Return a new BigNumber whose value is the value of this BigNumber multiplied by the value
   * of BigNumber(y, b).
   */
  P.multipliedBy = P.times = function (y, b) {
    var c, e, i, j, k, m, xcL, xlo, xhi, ycL, ylo, yhi, zc,
      base, sqrtBase,
      x = this,
      xc = x.c,
      yc = (y = new BigNumber(y, b)).c;

    // Either NaN, ±Infinity or ±0?
    if (!xc || !yc || !xc[0] || !yc[0]) {

      // Return NaN if either is NaN, or one is 0 and the other is Infinity.
      if (!x.s || !y.s || xc && !xc[0] && !yc || yc && !yc[0] && !xc) {
        y.c = y.e = y.s = null;
      } else {
        y.s *= x.s;

        // Return ±Infinity if either is ±Infinity.
        if (!xc || !yc) {
          y.c = y.e = null;

        // Return ±0 if either is ±0.
        } else {
          y.c = [0];
          y.e = 0;
        }
      }

      return y;
    }

    e = bitFloor(x.e / LOG_BASE) + bitFloor(y.e / LOG_BASE);
    y.s *= x.s;
    xcL = xc.length;
    ycL = yc.length;

    // Ensure xc points to longer array and xcL to its length.
    if (xcL < ycL) zc = xc, xc = yc, yc = zc, i = xcL, xcL = ycL, ycL = i;

    // Initialise the result array with zeros.
    for (i = xcL + ycL, zc = []; i--; zc.push(0));

    base = BASE;
    sqrtBase = SQRT_BASE;

    for (i = ycL; --i >= 0;) {
      c = 0;
      ylo = yc[i] % sqrtBase;
      yhi = yc[i] / sqrtBase | 0;

      for (k = xcL, j = i + k; j > i;) {
        xlo = xc[--k] % sqrtBase;
        xhi = xc[k] / sqrtBase | 0;
        m = yhi * xlo + xhi * ylo;
        xlo = ylo * xlo + ((m % sqrtBase) * sqrtBase) + zc[j] + c;
        c = (xlo / base | 0) + (m / sqrtBase | 0) + yhi * xhi;
        zc[j--] = xlo % base;
      }

      zc[j] = c;
    }

    if (c) {
      ++e;
    } else {
      zc.splice(0, 1);
    }

    return normalise(y, zc, e);
  };


  /*
   * Return a new BigNumber whose value is the value of this BigNumber negated,
   * i.e. multiplied by -1.
   */
  P.negated = function () {
    var x = new BigNumber(this);
    x.s = -x.s || null;
    return x;
  };


  /*
   *  n + 0 = n
   *  n + N = N
   *  n + I = I
   *  0 + n = n
   *  0 + 0 = 0
   *  0 + N = N
   *  0 + I = I
   *  N + n = N
   *  N + 0 = N
   *  N + N = N
   *  N + I = N
   *  I + n = I
   *  I + 0 = I
   *  I + N = N
   *  I + I = I
   *
   * Return a new BigNumber whose value is the value of this BigNumber plus the value of
   * BigNumber(y, b).
   */
  P.plus = function (y, b) {
    var t,
      x = this,
      a = x.s;

    y = new BigNumber(y, b);
    b = y.s;

    // Either NaN?
    if (!a || !b) return new BigNumber(NaN);

    // Signs differ?
     if (a != b) {
      y.s = -b;
      return x.minus(y);
    }

    var xe = x.e / LOG_BASE,
      ye = y.e / LOG_BASE,
      xc = x.c,
      yc = y.c;

    if (!xe || !ye) {

      // Return ±Infinity if either ±Infinity.
      if (!xc || !yc) return new BigNumber(a / 0);

      // Either zero?
      // Return y if y is non-zero, x if x is non-zero, or zero if both are zero.
      if (!xc[0] || !yc[0]) return yc[0] ? y : new BigNumber(xc[0] ? x : a * 0);
    }

    xe = bitFloor(xe);
    ye = bitFloor(ye);
    xc = xc.slice();

    // Prepend zeros to equalise exponents. Faster to use reverse then do unshifts.
    if (a = xe - ye) {
      if (a > 0) {
        ye = xe;
        t = yc;
      } else {
        a = -a;
        t = xc;
      }

      t.reverse();
      for (; a--; t.push(0));
      t.reverse();
    }

    a = xc.length;
    b = yc.length;

    // Point xc to the longer array, and b to the shorter length.
    if (a - b < 0) t = yc, yc = xc, xc = t, b = a;

    // Only start adding at yc.length - 1 as the further digits of xc can be ignored.
    for (a = 0; b;) {
      a = (xc[--b] = xc[b] + yc[b] + a) / BASE | 0;
      xc[b] = BASE === xc[b] ? 0 : xc[b] % BASE;
    }

    if (a) {
      xc = [a].concat(xc);
      ++ye;
    }

    // No need to check for zero, as +x + +y != 0 && -x + -y != 0
    // ye = MAX_EXP + 1 possible
    return normalise(y, xc, ye);
  };


  /*
   * If sd is undefined or null or true or false, return the number of significant digits of
   * the value of this BigNumber, or null if the value of this BigNumber is ±Infinity or NaN.
   * If sd is true include integer-part trailing zeros in the count.
   *
   * Otherwise, if sd is a number, return a new BigNumber whose value is the value of this
   * BigNumber rounded to a maximum of sd significant digits using rounding mode rm, or
   * ROUNDING_MODE if rm is omitted.
   *
   * sd {number|boolean} number: significant digits: integer, 1 to MAX inclusive.
   *                     boolean: whether to count integer-part trailing zeros: true or false.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {sd|rm}'
   */
  P.precision = P.sd = function (sd, rm) {
    var c, n, v,
      x = this;

    if (sd != null && sd !== !!sd) {
      intCheck(sd, 1, MAX);
      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);

      return round(new BigNumber(x), sd, rm);
    }

    if (!(c = x.c)) return null;
    v = c.length - 1;
    n = v * LOG_BASE + 1;

    if (v = c[v]) {

      // Subtract the number of trailing zeros of the last element.
      for (; v % 10 == 0; v /= 10, n--);

      // Add the number of digits of the first element.
      for (v = c[0]; v >= 10; v /= 10, n++);
    }

    if (sd && x.e + 1 > n) n = x.e + 1;

    return n;
  };


  /*
   * Return a new BigNumber whose value is the value of this BigNumber shifted by k places
   * (powers of 10). Shift to the right if n > 0, and to the left if n < 0.
   *
   * k {number} Integer, -MAX_SAFE_INTEGER to MAX_SAFE_INTEGER inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {k}'
   */
  P.shiftedBy = function (k) {
    intCheck(k, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
    return this.times('1e' + k);
  };


  /*
   *  sqrt(-n) =  N
   *  sqrt(N) =  N
   *  sqrt(-I) =  N
   *  sqrt(I) =  I
   *  sqrt(0) =  0
   *  sqrt(-0) = -0
   *
   * Return a new BigNumber whose value is the square root of the value of this BigNumber,
   * rounded according to DECIMAL_PLACES and ROUNDING_MODE.
   */
  P.squareRoot = P.sqrt = function () {
    var m, n, r, rep, t,
      x = this,
      c = x.c,
      s = x.s,
      e = x.e,
      dp = DECIMAL_PLACES + 4,
      half = new BigNumber('0.5');

    // Negative/NaN/Infinity/zero?
    if (s !== 1 || !c || !c[0]) {
      return new BigNumber(!s || s < 0 && (!c || c[0]) ? NaN : c ? x : 1 / 0);
    }

    // Initial estimate.
    s = Math.sqrt(+valueOf(x));

    // Math.sqrt underflow/overflow?
    // Pass x to Math.sqrt as integer, then adjust the exponent of the result.
    if (s == 0 || s == 1 / 0) {
      n = coeffToString(c);
      if ((n.length + e) % 2 == 0) n += '0';
      s = Math.sqrt(+n);
      e = bitFloor((e + 1) / 2) - (e < 0 || e % 2);

      if (s == 1 / 0) {
        n = '5e' + e;
      } else {
        n = s.toExponential();
        n = n.slice(0, n.indexOf('e') + 1) + e;
      }

      r = new BigNumber(n);
    } else {
      r = new BigNumber(s + '');
    }

    // Check for zero.
    // r could be zero if MIN_EXP is changed after the this value was created.
    // This would cause a division by zero (x/t) and hence Infinity below, which would cause
    // coeffToString to throw.
    if (r.c[0]) {
      e = r.e;
      s = e + dp;
      if (s < 3) s = 0;

      // Newton-Raphson iteration.
      for (; ;) {
        t = r;
        r = half.times(t.plus(div(x, t, dp, 1)));

        if (coeffToString(t.c).slice(0, s) === (n = coeffToString(r.c)).slice(0, s)) {

          // The exponent of r may here be one less than the final result exponent,
          // e.g 0.0009999 (e-4) --> 0.001 (e-3), so adjust s so the rounding digits
          // are indexed correctly.
          if (r.e < e) --s;
          n = n.slice(s - 3, s + 1);

          // The 4th rounding digit may be in error by -1 so if the 4 rounding digits
          // are 9999 or 4999 (i.e. approaching a rounding boundary) continue the
          // iteration.
          if (n == '9999' || !rep && n == '4999') {

            // On the first iteration only, check to see if rounding up gives the
            // exact result as the nines may infinitely repeat.
            if (!rep) {
              round(t, t.e + DECIMAL_PLACES + 2, 0);

              if (t.times(t).eq(x)) {
                r = t;
                break;
              }
            }

            dp += 4;
            s += 4;
            rep = 1;
          } else {

            // If rounding digits are null, 0{0,4} or 50{0,3}, check for exact
            // result. If not, then there are further digits and m will be truthy.
            if (!+n || !+n.slice(1) && n.charAt(0) == '5') {

              // Truncate to the first rounding digit.
              round(r, r.e + DECIMAL_PLACES + 2, 1);
              m = !r.times(r).eq(x);
            }

            break;
          }
        }
      }
    }

    return round(r, r.e + DECIMAL_PLACES + 1, ROUNDING_MODE, m);
  };


  /*
   * Return a string representing the value of this BigNumber in exponential notation and
   * rounded using ROUNDING_MODE to dp fixed decimal places.
   *
   * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
   */
  P.toExponential = function (dp, rm) {
    if (dp != null) {
      intCheck(dp, 0, MAX);
      dp++;
    }
    return format(this, dp, rm, 1);
  };


  /*
   * Return a string representing the value of this BigNumber in fixed-point notation rounding
   * to dp fixed decimal places using rounding mode rm, or ROUNDING_MODE if rm is omitted.
   *
   * Note: as with JavaScript's number type, (-0).toFixed(0) is '0',
   * but e.g. (-0.00001).toFixed(0) is '-0'.
   *
   * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
   */
  P.toFixed = function (dp, rm) {
    if (dp != null) {
      intCheck(dp, 0, MAX);
      dp = dp + this.e + 1;
    }
    return format(this, dp, rm);
  };


  /*
   * Return a string representing the value of this BigNumber in fixed-point notation rounded
   * using rm or ROUNDING_MODE to dp decimal places, and formatted according to the properties
   * of the format or FORMAT object (see BigNumber.set).
   *
   * The formatting object may contain some or all of the properties shown below.
   *
   * FORMAT = {
   *   prefix: '',
   *   groupSize: 3,
   *   secondaryGroupSize: 0,
   *   groupSeparator: ',',
   *   decimalSeparator: '.',
   *   fractionGroupSize: 0,
   *   fractionGroupSeparator: '\xA0',      // non-breaking space
   *   suffix: ''
   * };
   *
   * [dp] {number} Decimal places. Integer, 0 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   * [format] {object} Formatting options. See FORMAT pbject above.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {dp|rm}'
   * '[BigNumber Error] Argument not an object: {format}'
   */
  P.toFormat = function (dp, rm, format) {
    var str,
      x = this;

    if (format == null) {
      if (dp != null && rm && typeof rm == 'object') {
        format = rm;
        rm = null;
      } else if (dp && typeof dp == 'object') {
        format = dp;
        dp = rm = null;
      } else {
        format = FORMAT;
      }
    } else if (typeof format != 'object') {
      throw Error
        (bignumberError + 'Argument not an object: ' + format);
    }

    str = x.toFixed(dp, rm);

    if (x.c) {
      var i,
        arr = str.split('.'),
        g1 = +format.groupSize,
        g2 = +format.secondaryGroupSize,
        groupSeparator = format.groupSeparator || '',
        intPart = arr[0],
        fractionPart = arr[1],
        isNeg = x.s < 0,
        intDigits = isNeg ? intPart.slice(1) : intPart,
        len = intDigits.length;

      if (g2) i = g1, g1 = g2, g2 = i, len -= i;

      if (g1 > 0 && len > 0) {
        i = len % g1 || g1;
        intPart = intDigits.substr(0, i);
        for (; i < len; i += g1) intPart += groupSeparator + intDigits.substr(i, g1);
        if (g2 > 0) intPart += groupSeparator + intDigits.slice(i);
        if (isNeg) intPart = '-' + intPart;
      }

      str = fractionPart
       ? intPart + (format.decimalSeparator || '') + ((g2 = +format.fractionGroupSize)
        ? fractionPart.replace(new RegExp('\\d{' + g2 + '}\\B', 'g'),
         '$&' + (format.fractionGroupSeparator || ''))
        : fractionPart)
       : intPart;
    }

    return (format.prefix || '') + str + (format.suffix || '');
  };


  /*
   * Return an array of two BigNumbers representing the value of this BigNumber as a simple
   * fraction with an integer numerator and an integer denominator.
   * The denominator will be a positive non-zero value less than or equal to the specified
   * maximum denominator. If a maximum denominator is not specified, the denominator will be
   * the lowest value necessary to represent the number exactly.
   *
   * [md] {number|string|BigNumber} Integer >= 1, or Infinity. The maximum denominator.
   *
   * '[BigNumber Error] Argument {not an integer|out of range} : {md}'
   */
  P.toFraction = function (md) {
    var d, d0, d1, d2, e, exp, n, n0, n1, q, r, s,
      x = this,
      xc = x.c;

    if (md != null) {
      n = new BigNumber(md);

      // Throw if md is less than one or is not an integer, unless it is Infinity.
      if (!n.isInteger() && (n.c || n.s !== 1) || n.lt(ONE)) {
        throw Error
          (bignumberError + 'Argument ' +
            (n.isInteger() ? 'out of range: ' : 'not an integer: ') + valueOf(n));
      }
    }

    if (!xc) return new BigNumber(x);

    d = new BigNumber(ONE);
    n1 = d0 = new BigNumber(ONE);
    d1 = n0 = new BigNumber(ONE);
    s = coeffToString(xc);

    // Determine initial denominator.
    // d is a power of 10 and the minimum max denominator that specifies the value exactly.
    e = d.e = s.length - x.e - 1;
    d.c[0] = POWS_TEN[(exp = e % LOG_BASE) < 0 ? LOG_BASE + exp : exp];
    md = !md || n.comparedTo(d) > 0 ? (e > 0 ? d : n1) : n;

    exp = MAX_EXP;
    MAX_EXP = 1 / 0;
    n = new BigNumber(s);

    // n0 = d1 = 0
    n0.c[0] = 0;

    for (; ;)  {
      q = div(n, d, 0, 1);
      d2 = d0.plus(q.times(d1));
      if (d2.comparedTo(md) == 1) break;
      d0 = d1;
      d1 = d2;
      n1 = n0.plus(q.times(d2 = n1));
      n0 = d2;
      d = n.minus(q.times(d2 = d));
      n = d2;
    }

    d2 = div(md.minus(d0), d1, 0, 1);
    n0 = n0.plus(d2.times(n1));
    d0 = d0.plus(d2.times(d1));
    n0.s = n1.s = x.s;
    e = e * 2;

    // Determine which fraction is closer to x, n0/d0 or n1/d1
    r = div(n1, d1, e, ROUNDING_MODE).minus(x).abs().comparedTo(
        div(n0, d0, e, ROUNDING_MODE).minus(x).abs()) < 1 ? [n1, d1] : [n0, d0];

    MAX_EXP = exp;

    return r;
  };


  /*
   * Return the value of this BigNumber converted to a number primitive.
   */
  P.toNumber = function () {
    return +valueOf(this);
  };


  /*
   * Return a string representing the value of this BigNumber rounded to sd significant digits
   * using rounding mode rm or ROUNDING_MODE. If sd is less than the number of digits
   * necessary to represent the integer part of the value in fixed-point notation, then use
   * exponential notation.
   *
   * [sd] {number} Significant digits. Integer, 1 to MAX inclusive.
   * [rm] {number} Rounding mode. Integer, 0 to 8 inclusive.
   *
   * '[BigNumber Error] Argument {not a primitive number|not an integer|out of range}: {sd|rm}'
   */
  P.toPrecision = function (sd, rm) {
    if (sd != null) intCheck(sd, 1, MAX);
    return format(this, sd, rm, 2);
  };


  /*
   * Return a string representing the value of this BigNumber in base b, or base 10 if b is
   * omitted. If a base is specified, including base 10, round according to DECIMAL_PLACES and
   * ROUNDING_MODE. If a base is not specified, and this BigNumber has a positive exponent
   * that is equal to or greater than TO_EXP_POS, or a negative exponent equal to or less than
   * TO_EXP_NEG, return exponential notation.
   *
   * [b] {number} Integer, 2 to ALPHABET.length inclusive.
   *
   * '[BigNumber Error] Base {not a primitive number|not an integer|out of range}: {b}'
   */
  P.toString = function (b) {
    var str,
      n = this,
      s = n.s,
      e = n.e;

    // Infinity or NaN?
    if (e === null) {
      if (s) {
        str = 'Infinity';
        if (s < 0) str = '-' + str;
      } else {
        str = 'NaN';
      }
    } else {
      if (b == null) {
        str = e <= TO_EXP_NEG || e >= TO_EXP_POS
         ? toExponential(coeffToString(n.c), e)
         : toFixedPoint(coeffToString(n.c), e, '0');
      } else if (b === 10) {
        n = round(new BigNumber(n), DECIMAL_PLACES + e + 1, ROUNDING_MODE);
        str = toFixedPoint(coeffToString(n.c), n.e, '0');
      } else {
        intCheck(b, 2, ALPHABET.length, 'Base');
        str = convertBase(toFixedPoint(coeffToString(n.c), e, '0'), 10, b, s, true);
      }

      if (s < 0 && n.c[0]) str = '-' + str;
    }

    return str;
  };


  /*
   * Return as toString, but do not accept a base argument, and include the minus sign for
   * negative zero.
   */
  P.valueOf = P.toJSON = function () {
    return valueOf(this);
  };


  P._isBigNumber = true;

  P[Symbol.toStringTag] = 'BigNumber';

  // Node.js v10.12.0+
  P[Symbol.for('nodejs.util.inspect.custom')] = P.valueOf;

  if (configObject != null) BigNumber.set(configObject);

  return BigNumber;
}


// PRIVATE HELPER FUNCTIONS

// These functions don't need access to variables,
// e.g. DECIMAL_PLACES, in the scope of the `clone` function above.


function bitFloor(n) {
  var i = n | 0;
  return n > 0 || n === i ? i : i - 1;
}


// Return a coefficient array as a string of base 10 digits.
function coeffToString(a) {
  var s, z,
    i = 1,
    j = a.length,
    r = a[0] + '';

  for (; i < j;) {
    s = a[i++] + '';
    z = LOG_BASE - s.length;
    for (; z--; s = '0' + s);
    r += s;
  }

  // Determine trailing zeros.
  for (j = r.length; r.charCodeAt(--j) === 48;);

  return r.slice(0, j + 1 || 1);
}


// Compare the value of BigNumbers x and y.
function compare(x, y) {
  var a, b,
    xc = x.c,
    yc = y.c,
    i = x.s,
    j = y.s,
    k = x.e,
    l = y.e;

  // Either NaN?
  if (!i || !j) return null;

  a = xc && !xc[0];
  b = yc && !yc[0];

  // Either zero?
  if (a || b) return a ? b ? 0 : -j : i;

  // Signs differ?
  if (i != j) return i;

  a = i < 0;
  b = k == l;

  // Either Infinity?
  if (!xc || !yc) return b ? 0 : !xc ^ a ? 1 : -1;

  // Compare exponents.
  if (!b) return k > l ^ a ? 1 : -1;

  j = (k = xc.length) < (l = yc.length) ? k : l;

  // Compare digit by digit.
  for (i = 0; i < j; i++) if (xc[i] != yc[i]) return xc[i] > yc[i] ^ a ? 1 : -1;

  // Compare lengths.
  return k == l ? 0 : k > l ^ a ? 1 : -1;
}


/*
 * Check that n is a primitive number, an integer, and in range, otherwise throw.
 */
function intCheck(n, min, max, name) {
  if (n < min || n > max || n !== mathfloor(n)) {
    throw Error
     (bignumberError + (name || 'Argument') + (typeof n == 'number'
       ? n < min || n > max ? ' out of range: ' : ' not an integer: '
       : ' not a primitive number: ') + String(n));
  }
}


// Assumes finite n.
function isOdd(n) {
  var k = n.c.length - 1;
  return bitFloor(n.e / LOG_BASE) == k && n.c[k] % 2 != 0;
}


function toExponential(str, e) {
  return (str.length > 1 ? str.charAt(0) + '.' + str.slice(1) : str) +
   (e < 0 ? 'e' : 'e+') + e;
}


function toFixedPoint(str, e, z) {
  var len, zs;

  // Negative exponent?
  if (e < 0) {

    // Prepend zeros.
    for (zs = z + '.'; ++e; zs += z);
    str = zs + str;

  // Positive exponent
  } else {
    len = str.length;

    // Append zeros.
    if (++e > len) {
      for (zs = z, e -= len; --e; zs += z);
      str += zs;
    } else if (e < len) {
      str = str.slice(0, e) + '.' + str.slice(e);
    }
  }

  return str;
}


// EXPORT


var BigNumber = clone();

var bignumber = /*#__PURE__*/Object.freeze({
            __proto__: null,
            BigNumber: BigNumber,
            'default': BigNumber
});

var BigNumber$1 = getCjsExportFromNamespace(bignumber);

BigNumber$1.config({ RANGE: [-30, 30], EXPONENTIAL_AT: 1e+9 });
BigNumber$1.set({ DECIMAL_PLACES: 30, ROUNDING_MODE: BigNumber$1.ROUND_DOWN });    // equivalent

function Encoder (type, value) {
    const throwError = (val) => {
        throw new Error(`Error encoding ${val} to ${type}`)
    };
    const countDecimals = (n) => {
        if(Math.floor(n) === n) return 0;
        try{
            return n.toString().split(".")[1].length
        }catch (e){
            return 0
        } 
    };
    const isString = (val) => typeof val === 'string' || val instanceof String;
    const isArray = (val) => val && typeof val === 'object' && val.constructor === Array;
    const isObject = (val) => val && typeof val === 'object' && val.constructor === Object;
    const isDate = (val) => val instanceof Date;
    const isBoolean = (val) => typeof val === 'boolean';

    const isNumber = (val) => {
        if (isArray(val)) return false
        return !isNaN(encodeBigNumber(val).toNumber())
    };

    const isInteger = (val) => {
        if (!isNumber(val)) return false
        if (countDecimals(val) === 0) return true
        return false
    };
    const encodeInt = (val) => {
        if (!isNumber(val)) throwError(val);
        else return parseInt(val)
    };
    const isFloat = (val) => {
        if (!isNumber(val)) return false
        if (countDecimals(val) === 0) return false
        return true
    };
    const encodeFloat = (val) => {
        if(!isNumber(val)) throwError(val);
        if (!BigNumber$1.isBigNumber(val)) val = new BigNumber$1(val);

        return {"__fixed__": val.toFixed(30).replace(/^0+(\d)|(\d)0+$/gm, '$1$2')}
    };
    const encodeNumber = (val) => {
        if(!isNumber(val)) throwError(val);
        if (isFloat(val)) {
            if (!BigNumber$1.isBigNumber(val)) val = new BigNumber$1(val);
            return {"__fixed__": val.toFixed(30).replace(/^0+(\d)|(\d)0+$/gm, '$1$2')}
        }
        if (isInteger(val)) return parseInt(val)   
    };
    const encodeBigNumber = (val) => {
        if (!BigNumber$1.isBigNumber(val)) val = new BigNumber$1(val);
        return val
    };

    const encodeBool = (val) => {
        if (isBoolean(val)) return val
        if (val === 'true' || val === 1) return true
        if (val === 'false' || val === 0) return false
        throwError(val);
    };
    const encodeStr = (val) => {
        if (isString(val)) return val
        if (isDate(val)) return val.toISOString()
        return JSON.stringify(val)
    };
    const encodeDateTime = (val) => {
        val = !isDate(val) ? new Date(val) : val;
        if (!isDate(val)) throwError(val);
        return {'__time__': [
            val.getUTCFullYear(), 
            val.getUTCMonth(), 
            val.getUTCDate(), 
            val.getUTCHours(), 
            val.getUTCMinutes(), 
            val.getUTCSeconds(), 
            val.getUTCMilliseconds()
        ]}
    };
    const encodeTimeDelta = (val) => {
        const time = isDate(val) ? val.getTime() : new Date(val).getTime();
        const days = parseInt(time  / 1000 / 60 / 60 / 24);
        const seconds = (time - (days * 24 * 60 * 60 * 1000)) / 1000;
        return {'__delta__':[days, seconds]}
    };

    const encodeList = (val) => {
        if (isArray(val)) return parseObject(val)
        try{
            val = JSON.parse(val);
        }catch(e){
            throwError(val);
        }
        if (isArray(val)) return parseObject(val)
        throwError(val);
    };

    const encodeDict = (val) => {
        if (isObject(val)) return parseObject(val)
        try{
            val = JSON.parse(val);
        }catch(e){
            throwError(val);
        }
        if (isObject(val)) return parseObject(val)
        throwError(val);
    };

    const encodeObject = (val) => {
        try {
            return encodeList(val)
        }catch(e){
            return encodeDict(val)
        }
    };

    function parseObject (obj) {
        const encode = (k, v) => {
            if (k === "datetime" || k === "datetime.datetime" ) return Encoder("datetime.datetime", v)
            if (k === "timedelta" || k === "datetime.timedelta") return Encoder("datetime.timedelta", v)
            if (k !== "__fixed__" && isFloat(v)) return encodeFloat(v)
            return v
        };
    
        const fixDatetime = (k, v) => {
            const isDatetimeObject = (val) => {
                let datetimeTypes = ['datetime.datetime', 'datetime', 'datetime.timedelta', 'timedelta'];
                return Object.keys(val).length === 1 && datetimeTypes.filter(f => f === Object.keys(val)[0]).length > 0

            };

            if (v.constructor === Array) {
                v.map(val => {
                    if (Object.keys(val).length === 1 && isDatetimeObject(v)) return val[Object.keys(val)[0]]
                    //if (isFloat(val)) return encodeFloat(val)
                    return val
                });
            }
            if (v.constructor === Object) {
                if (Object.keys(v).length === 1 && isDatetimeObject(v)) return v[Object.keys(v)[0]]
            }

            //if (isFloat(v)) return encodeFloat(v)

            return v
        };
    
        let encodeValues = JSON.stringify(obj, encode);
        return JSON.parse(encodeValues, fixDatetime)
    }

    const encoder = {
        str: encodeStr,
        string: encodeStr,
        float: encodeFloat,
        int: encodeInt,
        bool: encodeBool,
        boolean: encodeBool,
        dict: encodeDict,
        list: encodeList,
        Any: () => value,
        "datetime.timedelta": encodeTimeDelta, 
        "datetime.datetime": encodeDateTime,
        timedelta: encodeTimeDelta, 
        datetime: encodeDateTime,
        number: encodeNumber,
        object: encodeObject,
        bigNumber: encodeBigNumber,
    };
    
    if (Object.keys(encoder).includes(type)) return encoder[type](value)
    else throw new Error(`Error: ${type} is not a valid encoder type.`)
}

Encoder.BigNumber = BigNumber$1;

var encoder = {
    Encoder
};
var encoder_1 = encoder.Encoder;

const { validateTypes } = validators;
const fetch = require('node-fetch').default;

class LamdenMasterNode_API{
    constructor(networkInfoObj){
        if (!validateTypes.isObjectWithKeys(networkInfoObj)) throw new Error(`Expected Object and got Type: ${typeof networkInfoObj}`)
        if (!validateTypes.isArrayWithValues(networkInfoObj.hosts)) throw new Error(`HOSTS Required (Type: Array)`)

        this.hosts = this.validateHosts(networkInfoObj.hosts);        
    }
    //This will throw an error if the protocol wasn't included in the host string
    vaidateProtocol(host){
        let protocols = ['https://', 'http://'];
        if (protocols.map(protocol => host.includes(protocol)).includes(true)) return host
        throw new Error('Host String must include http:// or https://')
    }
    validateHosts(hosts){
        return hosts.map(host => this.vaidateProtocol(host.toLowerCase()))
    }

    get host() {return this.hosts[Math.floor(Math.random() * this.hosts.length)]}
    get url() {return this.host}

    send(method, path, data, overrideURL, callback){
        let parms = '';
        if (Object.keys(data).includes('parms')) {
            parms = this.createParms(data.parms);
        }

        let options = {};
        if (method === 'POST'){
            let headers = {'Content-Type': 'application/json'};
            options.method = method;
            options.headers = headers;
            options.body = data;
        }

        return fetch(`${overrideURL ? overrideURL : this.url}${path}${parms}`, options)
            .then(res => {
                return res.json()
            } )
            .then(json => {
                    return callback(json, undefined)
            })
            .catch(err => {
                    return callback(undefined, err.toString())
                })
    }

    createParms(parms){
        if (Object.keys(parms).length === 0) return ''
        let parmString = '?';
        Object.keys(parms).forEach(key => {
            parmString = `${parmString}${key}=${parms[key]}&`;
        });
        return parmString.slice(0, -1);
    }

    async getContractInfo(contractName){
        let path = `/contracts/${contractName}`;
        return this.send('GET', path, {}, undefined, (res, err) => {
            if (err) return;
            return res
        })
    }

    async getVariable(contract, variable, key = ''){
        let parms = {};
        if (validateTypes.isStringWithValue(key)) parms.key = key;

        let path = `/contracts/${contract}/${variable}/`;
        return this.send('GET', path, {parms}, undefined, (res, err) => {
            if (err) return null;
            try{
                if (res.value) return res.value
            } catch (e){}
            return;
        })
    }

    async getContractMethods(contract){
        let path = `/contracts/${contract}/methods`;
        return this.send('GET', path, {}, undefined, (res, err) => {
            try{
                if (res.methods) return res.methods
            } catch (e){}
            return [];
        })
        
    }

    async getContractVariables(contract){
        let path = `/contracts/${contract}/variables`;
        return this.send('GET', path, {}, undefined, (res, err) => {
            try{
                if (res.variables) return res
            } catch (e){}
            return {};
        })
    }

    async pingServer(){
        return this.send('GET', '/ping', {}, undefined, (res, err) => {
            try { 
                if (res.status === 'online') return true;
            } 
            catch (e) {
                return false;
            }
        })
    }

    async getCurrencyBalance(vk){
        let balanceRes = await this.getVariable('currency', 'balances', vk);
        if (!balanceRes) return encoder_1('bigNumber', 0);
        if (balanceRes.__fixed__) return encoder_1('bigNumber', balanceRes.__fixed__)
        return encoder_1('bigNumber', balanceRes.toString());
    }

    async contractExists(contractName){
        let path = `/contracts/${contractName}`;
        return this.send('GET', path, {}, undefined, (res, err) => {
            try{
                if (res.name) return true;
            } catch (e){}
            return false;
        })
    }

    async sendTransaction(data, url = undefined, callback){
        return this.send('POST', '/', JSON.stringify(data), url, (res, err) => {
            if (err){
                if (callback) {
                    callback(undefined, err);
                    return;
                } 
                else return err
            }
            if (callback) {
                callback(res, undefined);
                return
            }
            return res;
        })   
    }

    async getNonce(sender, callback){
        if (!validateTypes.isStringHex(sender)) return `${sender} is not a hex string.`
        let path = `/nonce/${sender}`; 
        let url = this.host;
        return this.send('GET', path, {}, url, (res, err) => {
            if (err){
                if (callback) {
                    callback(undefined, `Unable to get nonce for ${sender} on network ${url}`);
                    return
                } 
                return `Unable to get nonce for ${sender} on network ${url}`
            }
            res.masternode = url;
            if (callback) {
                callback(res, undefined);
                return
            }
            else return res;
        })
    }

    async checkTransaction(hash, callback){
        const parms = {hash};
        return this.send('GET', '/tx', {parms}, undefined, (res, err) => {
            if (err){
                if (callback) {
                    callback(undefined, err);
                    return;
                }
                else return err
            }
            if (callback) {
                callback(res, undefined);
                return
            }
            return res;
        })  
    }
}

const { validateTypes: validateTypes$1 } = validators;

class Network {
    // Constructor needs an Object with the following information to build Class.
    //
    // networkInfo: {
    //      hosts: <array> list of masternode hostname/ip urls,
    //      type: <string> "testnet", "mainnet" or "custom"
    //  },
    constructor(networkInfoObj){
        //Reject undefined or missing info
        if (!validateTypes$1.isObjectWithKeys(networkInfoObj)) throw new Error(`Expected Network Info Object and got Type: ${typeof networkInfoObj}`)
        if (!validateTypes$1.isArrayWithValues(networkInfoObj.hosts)) throw new Error(`HOSTS Required (Type: Array)`)

        this.type = validateTypes$1.isStringWithValue(networkInfoObj.type) ? networkInfoObj.type.toLowerCase() : "custom";
        this.events = new EventEmitter();
        this.hosts = this.validateHosts(networkInfoObj.hosts);
        this.currencySymbol = validateTypes$1.isStringWithValue(networkInfoObj.currencySymbol) ? networkInfoObj.currencySymbol : 'TAU';
        this.name = validateTypes$1.isStringWithValue(networkInfoObj.name) ? networkInfoObj.name : 'lamden network';
        this.lamden = validateTypes$1.isBoolean(networkInfoObj.lamden) ? networkInfoObj.lamden : false;
        this.blockExplorer = validateTypes$1.isStringWithValue(networkInfoObj.blockExplorer) ? networkInfoObj.blockExplorer : undefined;
    
        this.online = false;
        try{
            this.API = new LamdenMasterNode_API(networkInfoObj);
        } catch (e) {
            throw new Error(e)
        }
    }
    //This will throw an error if the protocol wasn't included in the host string
    vaidateProtocol(host){
        let protocols = ['https://', 'http://'];
        if (protocols.map(protocol => host.includes(protocol)).includes(true)) return host
        throw new Error('Host String must include http:// or https://')
    }
    validateHosts(hosts){
        return hosts.map(host => this.vaidateProtocol(host.toLowerCase()))
    }
    //Check if the network is online
    //Emits boolean as 'online' event
    //Also returns status as well as passes status to a callback
    async ping(callback = undefined){
        this.online = await this.API.pingServer();
        this.events.emit('online', this.online);
        if (validateTypes$1.isFunction(callback)) callback(this.online);
        return this.online
    }
    get host() {return this.hosts[Math.floor(Math.random() * this.hosts.length)]}
    get url() {return this.host}
    getNetworkInfo(){
        return {
            name: this.name,
            lamden: this.lamden,
            type: this.type,
            hosts: this.hosts,
            url: this.url,
            online: this.online,
        }
    }
}

const { validateTypes: validateTypes$2 } = validators;

class TransactionBuilder extends Network {
    // Constructor needs an Object with the following information to build Class.
    //  
    // arg[0] (networkInfo): {  //Can also accpet a Lamden "Network Class"
    //      host: <string> masternode webserver hostname/ip,
    //      type: <string> "testnet", "mainnet" or "mockchain"
    //  }
    //  arg[1] (txInfo): {
    //      uid: [Optional] <string> unique ID for tracking purposes, 
    //      senderVk: <hex string> public key of the transaction sender,
    //      contractName: <string> name of lamden smart contract,
    //      methodName: <string> name of method to call in contractName,
    //      kwargs: <object> key/values of args to pass to methodName
    //              example: kwargs.to = "270add00fc708791c97aeb5255107c770434bd2ab71c2e103fbee75e202aa15e"
    //                       kwargs.amount = 1000
    //      stampLimit: <integer> the max amount of stamps the tx should use.  tx could use less. if tx needs more the tx will fail.
    //      nonce: [Optional] <integer> send() will attempt to retrieve this info automatically
    //      processor [Optional] <string> send() will attempt to retrieve this info automatically
    //  }
    //  arg[2] (txData): [Optional] state hydrating data
    constructor(networkInfo, txInfo, txData) {
        if (validateTypes$2.isSpecificClass(networkInfo, 'Network'))
            super(networkInfo.getNetworkInfo());
        else super(networkInfo);

        //Validate arguments
        if(!validateTypes$2.isObjectWithKeys(txInfo)) throw new Error(`txInfo object not found`)
        if(!validateTypes$2.isStringHex(txInfo.senderVk)) throw new Error(`Sender Public Key Required (Type: Hex String)`)
        if(!validateTypes$2.isStringWithValue(txInfo.contractName)) throw new Error(`Contract Name Required (Type: String)`)
        if(!validateTypes$2.isStringWithValue(txInfo.methodName)) throw new Error(`Method Required (Type: String)`)
        if(!validateTypes$2.isInteger(txInfo.stampLimit)) throw new Error(`Stamps Limit Required (Type: Integer)`)        

        //Store variables in self for reference
        this.uid = validateTypes$2.isStringWithValue(txInfo.uid) ? txInfo.uid : undefined;
        this.sender = txInfo.senderVk;
        this.contract = txInfo.contractName;
        this.method = txInfo.methodName;
        this.kwargs = {};
        if(validateTypes$2.isObject(txInfo.kwargs)) this.kwargs = txInfo.kwargs;
        this.stampLimit = txInfo.stampLimit;

        //validate and set nonce and processor if user provided them
        if (typeof txInfo.nonce !== 'undefined'){
            if(!validateTypes$2.isInteger(txInfo.nonce)) throw new Error(`arg[6] Nonce is required to be an Integer, type ${typeof txInfo.none} was given`)
            this.nonce = txInfo.nonce;
        }
        if (typeof txInfo.processor !== 'undefined'){
            if(!validateTypes$2.isStringWithValue(txInfo.processor)) throw new Error(`arg[7] Processor is required to be a String, type ${typeof txInfo.processor} was given`)
            this.processor = txInfo.processor;
        }
        
        this.signature;
        this.transactionSigned = false;

        //Transaction result information
        this.nonceResult = {};
        this.txSendResult = {errors:[]};
        this.txBlockResult = {};
        this.txHash;
        this.txCheckResult = {};
        this.txCheckAttempts = 0;
        this.txCheckLimit = 10;
        
        //Hydrate other items if passed
        if (txData){
            if (txData.uid) this.uid = txData.uid;
            if (validateTypes$2.isObjectWithKeys(txData.txSendResult)) this.txSendResult = txData.txSendResult;
            if (validateTypes$2.isObjectWithKeys(txData.nonceResult)){
                this.nonceResult = txData.nonceResult;
                if (validateTypes$2.isInteger(this.nonceResult.nonce)) this.nonce = this.nonceResult.nonce;
                if (validateTypes$2.isStringWithValue(this.nonceResult.processor)) this.processor = this.nonceResult.processor;
            }
            if (validateTypes$2.isObjectWithKeys(txData.txSendResult)){
                this.txSendResult = txData.txSendResult;
                if (this.txSendResult.hash) this.txHash = this.txSendResult.hash;
            } 
            if (validateTypes$2.isObjectWithKeys(txData.txBlockResult)) this.txBlockResult = txData.txBlockResult;
            if (validateTypes$2.isObjectWithKeys(txData.resultInfo)) this.resultInfo = txData.resultInfo;
        }
        //Create Capnp messages and transactionMessages
        this.makePayload();
    }
    makePayload(){
        this.payload = {
            contract: this.contract,
            function: this.method,
            kwargs: this.kwargs,
            nonce: this.nonce,
            processor: this.processor,
            sender: this.sender,
            stamps_supplied: this.stampLimit
        };
        this.sortedPayload = this.sortObject(this.payload);
    }
    makeTransaction(){
        this.tx = {
            metadata: {
                signature: this.signature,
                timestamp: parseInt(+new Date / 1000),
            },
            payload: this.sortedPayload.orderedObj
        };
    }
    verifySignature(){
        //Verify the signature is correct
        if (!this.transactionSigned) throw new Error('Transaction has not be been signed. Use the sign(<private key>) method first.')
        const stringBuffer = Buffer.from(this.sortedPayload.json);
        const stringArray = new Uint8Array(stringBuffer);
        return verify(this.sender, stringArray, this.signature)
    }
    sign(sk){
        const stringBuffer = Buffer.from(this.sortedPayload.json);
        const stringArray = new Uint8Array(stringBuffer);
        this.signature = sign(sk, stringArray);
        this.transactionSigned = true;
    }
    sortObject(object){
        const processObj = (obj) => {
            const getType = (value) => {
             return Object.prototype.toString.call(value)
            };
            const isArray = (value) => {
             if(getType(value) === "[object Array]") return true;
             return false;  
            };
            const isObject = (value) => {
             if(getType(value) === "[object Object]") return true;
             return false;  
            };
        
            const sortObjKeys = (unsorted) => {
                const sorted = {};
                Object.keys(unsorted).sort().forEach(key => sorted[key] = unsorted[key]);
                return sorted
            };
        
            const formatKeys = (unformatted) => {
                Object.keys(unformatted).forEach(key => {
                        if (isArray(unformatted[key])) unformatted[key] = unformatted[key].map(item => {
                        if (isObject(item)) return formatKeys(item)
                        return item
                    });
                    if (isObject(unformatted[key])) unformatted[key] = formatKeys(unformatted[key]);
                });
                return sortObjKeys(unformatted)
            };
        
            if (!isObject(obj)) throw new TypeError('Not a valid Object')
                try{
                    obj = JSON.parse(JSON.stringify(obj));
                } catch (e) {
                    throw new TypeError('Not a valid JSON Object')
                }
            return formatKeys(obj)
        };
        const orderedObj = processObj(object);
        return { 
            orderedObj, 
            json: JSON.stringify(orderedObj)
        }
    }
    async getNonce(callback = undefined) {
        let timestamp =  new Date().toUTCString();
        this.nonceResult = await this.API.getNonce(this.sender);
        if (typeof this.nonceResult.nonce === 'undefined'){
            throw new Error(this.nonceResult)
        }
        this.nonceResult.timestamp = timestamp;
        this.nonce = this.nonceResult.nonce;
        this.processor = this.nonceResult.processor;
        this.nonceMasternode = this.nonceResult.masternode;
        //Create payload object
        this.makePayload();

        if (!callback) return this.nonceResult;
        return callback(this.nonceResult)
    }
    async send(sk = undefined, masternode = undefined, callback = undefined) {
        //Error if transaction is not signed and no sk provided to the send method to sign it before sending
        if (!validateTypes$2.isStringWithValue(sk) && !this.transactionSigned){
            throw new Error(`Transation Not Signed: Private key needed or call sign(<private key>) first`);
        }

        let timestamp =  new Date().toUTCString();

        try{
            //If the nonce isn't set attempt to get it
            if (isNaN(this.nonce) || !validateTypes$2.isStringWithValue(this.processor)) await this.getNonce();
            //if the sk is provided then sign the transaction
            if (validateTypes$2.isStringWithValue(sk)) this.sign(sk);
            //Serialize transaction
            this.makeTransaction();
            //Send transaction to the masternode
            let masternodeURL = masternode;
            if (!masternodeURL && this.nonceMasternode) masternodeURL = this.nonceMasternode;
            let response = await this.API.sendTransaction(this.tx, masternodeURL);
            //Set error if txSendResult doesn't exist
            if (response === 'undefined' || validateTypes$2.isStringWithValue(response)){
                this.txSendResult.errors = ['TypeError: Failed to fetch'];
            }else {
                if (response.error) this.txSendResult.errors = [response.error];
                else this.txSendResult = response;
            }
        } catch (e){
            this.txSendResult.errors = [e.message];
        }
        this.txSendResult.timestamp = timestamp;
        return this.handleMasterNodeResponse(this.txSendResult, callback)
    }
    checkForTransactionResult(callback = undefined){
        return new Promise((resolve) => {
            let timerId = setTimeout(async function checkTx() {
                this.txCheckAttempts = this.txCheckAttempts + 1;
                const res = await this.API.checkTransaction(this.txHash);
                let checkAgain = false;
                const timestamp =  new Date().toUTCString();
                if (typeof res === 'undefined'){
                    res = {};
                    res.error = 'TypeError: Failed to fetch';
                }else {
                    if (typeof res === 'string') {
                        if (this.txCheckAttempts < this.txCheckLimit){
                            checkAgain = true;
                        }else {
                            this.txCheckResult.errors = [res];
                        }
                    }else {
                        if (res.error){
                            if (res.error === 'Transaction not found.'){
                                if (this.txCheckAttempts < this.txCheckLimit){
                                    checkAgain = true;
                                }else {
                                    this.txCheckResult.errors = [res.error, `Retry Attmpts ${this.txCheckAttempts} hit while checking for Tx Result.`];
                                }
                            }else {
                                this.txCheckResult.errors = [res.error];
                            }
                        }else {
                            this.txCheckResult = res;
                        }
                    }
                }
                if (checkAgain) timerId = setTimeout(checkTx.bind(this), 1000);
                else {
                    if (validateTypes$2.isNumber(this.txCheckResult.status)){
                        if (this.txCheckResult.status > 0){
                            if (!validateTypes$2.isArray(this.txCheckResult.errors)) this.txCheckResult.errors = [];
                            this.txCheckResult.errors.push('This transaction returned a non-zero status code');
                        }
                    }
                    this.txCheckResult.timestamp = timestamp;
                    clearTimeout(timerId);
                    resolve(this.handleMasterNodeResponse(this.txCheckResult, callback));
                }
            }.bind(this), 1000);
        })
    }
    handleMasterNodeResponse(result, callback = undefined){
        //Check to see if this is a successful transacation submission
        if (validateTypes$2.isStringWithValue(result.hash) && validateTypes$2.isStringWithValue(result.success)){
            this.txHash = result.hash;
            this.setPendingBlockInfo();
        }else {
            this.setBlockResultInfo(result);
            this.txBlockResult = result;
        }
        this.events.emit('response', result, this.resultInfo.subtitle);
        if (validateTypes$2.isFunction(callback)) callback(result);
        return result
    }
    setPendingBlockInfo(){
        this.resultInfo =  {
            title: 'Transaction Pending',
            subtitle: 'Your transaction was submitted and is being processed',
            message: `Tx Hash: ${this.txHash}`,
            type: 'success',
        };
        return this.resultInfo;
    }
    setBlockResultInfo(result){
        let erroredTx = false;
        let errorText = `returned an error and `;
        let statusCode = validateTypes$2.isNumber(result.status) ? result.status : undefined;
        let stamps = (result.stampsUsed || result.stamps_used) || 0;
        let message = '';
        if(validateTypes$2.isArrayWithValues(result.errors)){
            erroredTx = true;
            message = `This transaction returned ${result.errors.length} errors.`;
            if (result.result){
                if (result.result.includes('AssertionError')) result.errors.push(result.result);
            }
        }
        if (statusCode && erroredTx) errorText = `returned status code ${statusCode} and `;
          
        this.resultInfo = {
            title: `Transaction ${erroredTx ? 'Failed' : 'Successful'}`,
            subtitle: `Your transaction ${erroredTx ? `${errorText} ` : ''}used ${stamps} stamps`,
            message,
            type: `${erroredTx ? 'error' : 'success'}`,
            errorInfo: erroredTx ? result.errors : undefined,
            returnResult: result.result || "",
            stampsUsed: stamps,
            statusCode
        };
        return this.resultInfo;
    }
    getResultInfo(){
        return this.resultInfo;
    }
    getTxInfo(){
        return {
            senderVk: this.sender,
            contractName: this.contract,
            methodName: this.method,
            kwargs: this.kwargs,
            stampLimit: this.stampLimit
        }
    }
    getAllInfo(){
        return {
            uid: this.uid,
            txHash: this.txHash,
            signed: this.transactionSigned,
            tx: this.tx,
            signature: this.signature,
            networkInfo: this.getNetworkInfo(),
            txInfo: this.getTxInfo(),
            txSendResult: this.txSendResult,
            txBlockResult: this.txBlockResult,
            resultInfo: this.getResultInfo(),
            nonceResult: this.nonceResult
        }
    }
}

const { validateTypes: validateTypes$3 } = validators;

class TransactionBatcher extends Network {
    constructor(networkInfo) {
        if (validateTypes$3.isSpecificClass(networkInfo, 'Network'))
            super(networkInfo.getNetworkInfo());
        else super(networkInfo);

        this.txBatches = {};
        this.overflow = [];
        this.nonceResults = {};
        this.running = false;
    }
    addTransaction(txInfo){
        if (this.running) {
            this.overflow.push(txInfo);
            return
        }
        this.validateTransactionInfo(txInfo);
        if (!this.txBatches[txInfo.senderVk]) this.txBatches[txInfo.senderVk] = [];
        this.txBatches[txInfo.senderVk].push(txInfo);
    }
    addTransactionList(txList){
        txList.forEach(txInfo => this.addTransaction(txInfo));
    }
    processOverflow(){
        const overflow = this.overflow;
        this.overflow = [];
        overflow.forEach(txInfo => this.addTransaction(txInfo));
    }
    hasTransactions(){
        let test = Object.keys(this.txBatches).map(senderVk => this.txBatches[senderVk].length);
        test.filter(f => f === 0);
        if (test.length > 0 ) return true
        return false
    }
    validateTransactionInfo(txInfo){
        try{
            new TransactionBuilder(txInfo);
        }catch(e){
            return false
        }
        return true
    }
    async getStartingNonce(senderVk, callback = undefined){
        let timestamp =  new Date().toUTCString();
        let response = await this.API.getNonce(senderVk);
        if (typeof response.nonce === 'undefined'){
            throw new Error(response)
        }
        response.timestamp = timestamp;
        this.nonceResults[senderVk] = response;

        if (callback) callback(response);
        return response;
    }
    async sendAllBatches(keyDict){
        if (this.running) return
        let sentTransactions = [];
        this.running = true;
        
        await Promise.all(Object.keys(this.txBatches).map((senderVk) => {
            const senderBatch = this.txBatches[senderVk].splice(0,15);
            if (senderBatch.length <= 15) delete this.txBatches[senderVk];
            
            return new Promise(async (resolver) => {
                if (senderBatch.length === 0 ) resolver();

                if (!keyDict[senderVk]) throw new Error(`Cannot sign batch for ${senderVk}. No signing key provided.`)
                let nonceResponse = await this.getStartingNonce(senderVk);
                let txBatch = this.setBatchNonces(nonceResponse, senderBatch);
                this.signBatch(txBatch, keyDict[senderVk]);
                this.sendBatch(txBatch).then(sentList => {
                    sentTransactions = [...sentTransactions, ...sentList];
                    resolver();
                });                
            })
        }));

        try{
            return Promise.all(sentTransactions)
        }catch (e){}
        finally{
            this.running = false;
            this.processOverflow();
        }
    }
    setBatchNonces(nonceResult, txList){
        return txList.map((txInfo, index) => {
            txInfo.nonce = nonceResult.nonce + index;
            txInfo.processor = nonceResult.processor;
            return new TransactionBuilder({hosts: [nonceResult.masternode]}, txInfo)
        }).sort((a, b) => a.nonce - b.nonce)
    }
    signBatch(txBatch, key){
        txBatch.forEach(txBuilder => txBuilder.sign(key));
    }
    sendBatch(txBatch){
        let resolvedTransactions = [];
        return new Promise(resolver => {
            const resolve = (index) => {
                if ((index + 1) === txBatch.length) resolver(resolvedTransactions);
            };
            txBatch.forEach((txBuilder, index) => {
                const delayedSend = () => {
                    resolvedTransactions[index] = txBuilder.send().then(() => {return txBuilder});
                    resolve(index);
                };
                setTimeout(delayedSend, 1200 * index);
            });
        })
    }
}

var index = {
    TransactionBuilder,
    TransactionBatcher,
    Masternode_API: LamdenMasterNode_API,
    Network,
    wallet,
    Encoder: encoder_1
};

module.exports = index;