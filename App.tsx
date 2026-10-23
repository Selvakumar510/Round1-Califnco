import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Category, formatPrice, Product, products } from './src/catalog';
import { Order, Role, ServiceRequest, useDemoState } from './src/DemoState';
import { AccountScreen } from './src/components/AccountScreen';
import {
  createOrder,
  createServiceRequest,
  decideDealerApplication,
  OrderInput,
  updateOrderStatus,
  updateServiceStatus,
} from './src/firebaseData';
type Screen = 'home' | 'shop' | 'service' | 'orders' | 'profile' | 'admin' | 'account';

const navy = '#12334B';
const blue = '#167D9A';
const muted = '#758695';
const categories: Array<Category | 'All'> = ['All', 'Purifiers', 'Dispensers', 'Pumps', 'Filters', 'Spares'];
const navItems: Array<{ id: Screen; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'shop', label: 'Shop', icon: '◫' },
  { id: 'service', label: 'Service', icon: '✳' },
  { id: 'orders', label: 'Orders', icon: '▤' },
  { id: 'profile', label: 'Profile', icon: '◉' },
];

function App() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const routeScreen = pathname.split('/').filter(Boolean).pop();
  const screen: Screen =
    routeScreen === 'shop' || routeScreen === 'service' || routeScreen === 'orders' || routeScreen === 'profile' || routeScreen === 'admin'
      ? routeScreen
      : routeScreen === 'account'
        ? routeScreen
      : 'home';
  const {
    role,
    setRole,
    cart,
    setCart,
    orders,
    setOrders,
    services,
    setServices,
    dealerApplications,
    setDealerApplications,
    authUser,
    profile,
    authLoading,
    firebaseError,
    setFirebaseError,
    firebaseEnabled,
  } = useDemoState();
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [query, setQuery] = useState('');
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [serviceType, setServiceType] = useState('Routine maintenance');
  const [serviceDate, setServiceDate] = useState('');
  const [serviceAddress, setServiceAddress] = useState('12, Palm Grove Road, Bengaluru');
  const [toast, setToast] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isDealer = role === 'Dealer';
  const isAdmin = role === 'Admin';
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartItems = products.filter((product) => cart[product.id]);
  const total = cartItems.reduce(
    (sum, product) => sum + (isDealer ? product.dealerPrice : product.price) * cart[product.id],
    0,
  );
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory = category === 'All' || product.category === category;
        const matchesQuery = `${product.name} ${product.category} ${product.id}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        return matchesCategory && matchesQuery;
      }),
    [category, query],
  );
  const cardWidth = width > 1100 ? '23.5%' : width > 720 ? '31.5%' : '48.5%';
  const compact = width <= 720;
  const contentWidth = width > 1240 ? 1180 : undefined;

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  };

  const changeRole = () => {
    if (firebaseEnabled) {
      router.replace('/account');
      return;
    }
    const nextRole: Role = role === 'Customer' ? 'Dealer' : role === 'Dealer' ? 'Admin' : 'Customer';
    setRole(nextRole);
    router.replace(nextRole === 'Admin' ? '/admin' : '/');
    notify(nextRole === 'Admin' ? 'Admin demo workspace opened' : `Switched to ${nextRole} preview`);
  };

  const addToCart = (product: Product) => {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] || 0) + 1 }));
    notify(`${product.name} added to your bag`);
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart((current) => {
      const nextQuantity = (current[productId] || 0) + delta;
      const next = { ...current };
      if (nextQuantity <= 0) delete next[productId];
      else next[productId] = nextQuantity;
      return next;
    });
  };

  const placeOrder = async (checkout: { customerName: string; phone: string; address: string; paymentMethod: 'UPI' | 'Cash on delivery' }) => {
    if (cartCount === 0) return;
    if (firebaseEnabled && (!authUser || !profile)) {
      setCheckoutVisible(false);
      router.replace('/account');
      notify('Sign in with a complete account profile to place an order');
      return;
    }
    if (firebaseEnabled && authUser && profile) {
      try {
        const input: OrderInput = {
          total,
          items: cartCount,
          phone: checkout.phone.trim(),
          address: checkout.address.trim(),
          paymentMethod: checkout.paymentMethod,
          lines: cartItems.map((product) => ({
            productId: product.id,
            name: product.name,
            quantity: cart[product.id],
            unitPrice: isDealer ? product.dealerPrice : product.price,
          })),
        };
        await createOrder(authUser.uid, checkout.customerName.trim() || profile.displayName, role, input);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Order could not be saved.';
        setFirebaseError(message);
        notify(`Order failed: ${message}`);
        return;
      }
    }
    const order: Order = {
      id: `AP-${Math.floor(25000 + Math.random() * 74999)}`,
      customer: firebaseEnabled ? checkout.customerName.trim() || profile?.displayName || 'Customer' : isDealer ? 'Demo Dealer' : 'You',
      date: 'Today',
      total,
      status: 'Processing',
      items: cartCount,
    };
    if (!firebaseEnabled) setOrders((current) => [order, ...current]);
    setCart({});
    setCheckoutVisible(false);
    router.replace('/orders');
    notify('Order placed — we’ll keep you updated');
  };

  const bookService = async () => {
    if (!serviceDate.trim()) {
      notify('Choose a preferred service date first');
      return;
    }
    const request: ServiceRequest = {
      id: `SR-${Math.floor(2000 + Math.random() * 7000)}`,
      name: 'You',
      service: serviceType,
      date: serviceDate,
      status: 'Scheduled',
    };
    if (firebaseEnabled && (!authUser || !profile)) {
      router.replace('/account');
      notify('Sign in with a complete account profile to book service');
      return;
    }
    if (firebaseEnabled && authUser && profile) {
      try {
        await createServiceRequest(authUser.uid, profile.displayName, {
          service: serviceType,
          date: serviceDate.trim(),
          address: serviceAddress.trim(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Service request could not be saved.';
        setFirebaseError(message);
        notify(`Service request failed: ${message}`);
        return;
      }
    } else {
      setServices((current) => [request, ...current]);
    }
    setServiceDate('');
    notify('Service visit requested');
  };

  const cycleOrderStatus = async (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    const statusSequence: Order['status'][] = ['Processing', 'Confirmed', 'Shipped', 'Delivered'];
    const nextStatus = statusSequence[(statusSequence.indexOf(order.status) + 1) % statusSequence.length];
    if (firebaseEnabled) {
      try {
        await updateOrderStatus(orderId, nextStatus);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Order status could not be updated.';
        setFirebaseError(message);
        notify(`Status update failed: ${message}`);
      }
      return;
    }
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order;
        return { ...order, status: nextStatus };
      }),
    );
  };

  const cycleServiceStatus = async (serviceId: string) => {
    const service = services.find((item) => item.id === serviceId);
    if (!service) return;
    const nextStatus: ServiceRequest['status'] = service.status === 'Scheduled' ? 'In review' : 'Scheduled';
    if (firebaseEnabled) {
      try {
        await updateServiceStatus(serviceId, nextStatus);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Service status could not be updated.';
        setFirebaseError(message);
        notify(`Service update failed: ${message}`);
      }
      return;
    }
    setServices((current) => current.map((item) => item.id === serviceId ? { ...item, status: nextStatus } : item));
  };

  const selectScreen = (selected: Screen) => {
    if (selected === 'home') router.replace('/');
    else router.replace(`/${selected}`);
    setMobileNavOpen(false);
  };

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <View style={[styles.topBar, compact && styles.topBarCompact]}>
        <Pressable style={styles.brand} onPress={() => selectScreen('home')}>
          <View style={styles.brandMark}><Text style={styles.brandDrop}>●</Text></View>
          <View>
            <Text style={styles.brandName}>aqua<Text style={styles.brandAccent}>pure</Text></Text>
            <Text style={styles.brandCaption}>WELLNESS, MADE CLEAR</Text>
          </View>
        </Pressable>
        <View style={[styles.desktopNav, compact && styles.hidden]}>
          {navItems.slice(0, 4).map((item) => (
            <Pressable key={item.id} onPress={() => selectScreen(item.id)} style={styles.topNavItem}>
              <Text style={[styles.topNavText, screen === item.id && styles.topNavActive]}>{item.label}</Text>
            </Pressable>
          ))}
          {isAdmin && (
            <Pressable onPress={() => selectScreen('admin')} style={styles.topNavItem}>
              <Text style={[styles.topNavText, screen === 'admin' && styles.topNavActive]}>Admin</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.topActions}>
          <Pressable accessibilityLabel="Open cart" style={styles.bagButton} onPress={() => setCheckoutVisible(true)}>
            <Text style={styles.bagIcon}>♧</Text>
            {cartCount > 0 && <View style={styles.bagCount}><Text style={styles.bagCountText}>{cartCount}</Text></View>}
          </Pressable>
          <Pressable style={[styles.rolePill, isAdmin && styles.adminPill]} onPress={firebaseEnabled ? () => selectScreen('account') : changeRole}>
            <Text style={styles.roleDot}>●</Text>
            <Text style={styles.roleText}>{firebaseEnabled ? authUser ? profile?.role ?? 'Account' : 'Sign in' : `${role} ▾`}</Text>
          </Pressable>
          <Pressable accessibilityLabel="Open navigation" style={[styles.menuButton, compact && styles.menuButtonVisible]} onPress={() => setMobileNavOpen((open) => !open)}>
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>
        </View>
      </View>

      {mobileNavOpen && (
        <View style={styles.mobileMenu}>
          {[...navItems, ...(isAdmin ? [{ id: 'admin' as Screen, label: 'Admin dashboard', icon: '▦' }] : [])].map((item) => (
            <Pressable key={item.id} style={styles.mobileMenuItem} onPress={() => selectScreen(item.id)}>
              <Text style={styles.mobileMenuIcon}>{item.icon}</Text>
              <Text style={styles.mobileMenuText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView style={styles.pageScroll} contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentCompact]}>
        <View style={[styles.content, contentWidth ? { maxWidth: contentWidth, alignSelf: 'center', width: '100%' } : null]}>
          {firebaseEnabled && firebaseError !== '' && <View style={styles.firebaseError}><Text style={styles.firebaseErrorTitle}>Firebase needs attention</Text><Text style={styles.firebaseErrorText}>{firebaseError}</Text></View>}
          {isDealer && <View style={styles.dealerBanner}><Text style={styles.dealerBannerText}>DEALER PORTAL</Text><Text style={styles.dealerBannerHint}>Wholesale pricing is active on every product</Text></View>}
          {screen === 'home' && (
            <HomeScreen
              onShop={() => selectScreen('shop')}
              onService={() => selectScreen('service')}
              onAdd={addToCart}
              priceFor={(product) => isDealer ? product.dealerPrice : product.price}
              cardWidth={cardWidth}
              compact={compact}
            />
          )}
          {screen === 'shop' && (
            <ShopScreen
              products={filteredProducts}
              category={category}
              setCategory={setCategory}
              query={query}
              setQuery={setQuery}
              onAdd={addToCart}
              priceFor={(product) => isDealer ? product.dealerPrice : product.price}
              cardWidth={cardWidth}
            />
          )}
          {screen === 'service' && (
            <ServiceScreen
              serviceType={serviceType}
              setServiceType={setServiceType}
              serviceDate={serviceDate}
              setServiceDate={setServiceDate}
              serviceAddress={serviceAddress}
              setServiceAddress={setServiceAddress}
              onBook={bookService}
              onOrder={() => selectScreen('orders')}
            />
          )}
          {screen === 'orders' && <OrdersScreen orders={orders} />}
          {screen === 'profile' && firebaseEnabled && <AccountScreen enabled userEmail={authUser?.email ?? null} profile={profile} pendingDealer={dealerApplications.find((dealer) => dealer.id === authUser?.uid) ?? null} loading={authLoading} onDemoRole={changeRole} onNotice={notify} />}
          {screen === 'profile' && !firebaseEnabled && <ProfileScreen role={role} onRole={changeRole} onOrders={() => selectScreen('orders')} onService={() => selectScreen('service')} />}
          {screen === 'account' && <AccountScreen enabled={firebaseEnabled} userEmail={authUser?.email ?? null} profile={profile} pendingDealer={dealerApplications.find((dealer) => dealer.id === authUser?.uid) ?? null} loading={authLoading} onDemoRole={changeRole} onNotice={notify} />}
          {screen === 'admin' && isAdmin && (
            <AdminScreen
              orders={orders}
              services={services}
              dealerApplications={dealerApplications}
              onOrderStatus={cycleOrderStatus}
              onServiceStatus={cycleServiceStatus}
              onDealerDecision={async (id, status) => {
                if (firebaseEnabled) {
                  try {
                    await decideDealerApplication(id, status);
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Dealer application could not be updated.';
                    setFirebaseError(message);
                    notify(`Dealer decision failed: ${message}`);
                  }
                } else {
                  setDealerApplications((current) => current.map((dealer) => dealer.id === id ? { ...dealer, status } : dealer));
                }
                const dealerName = dealerApplications.find((dealer) => dealer.id === id)?.name;
                if (dealerName) notify(`${dealerName}: ${status.toLowerCase()}${firebaseEnabled ? '' : ' in this demo'}`);
              }}
            />
          )}
          {screen === 'admin' && !isAdmin && firebaseEnabled && <AccountScreen enabled userEmail={authUser?.email ?? null} profile={profile} pendingDealer={dealerApplications.find((dealer) => dealer.id === authUser?.uid) ?? null} loading={authLoading} onDemoRole={changeRole} onNotice={notify} />}
          {screen === 'admin' && !isAdmin && !firebaseEnabled && <ProfileScreen role={role} onRole={changeRole} onOrders={() => selectScreen('orders')} onService={() => selectScreen('service')} />}
        </View>
      </ScrollView>

      {!isAdmin && <View style={[styles.bottomNav, compact && styles.bottomNavVisible]}>
        {navItems.map((item) => (
          <Pressable key={item.id} onPress={() => selectScreen(item.id)} style={styles.bottomNavItem}>
            <Text style={[styles.bottomNavIcon, screen === item.id && styles.bottomNavSelected]}>{item.icon}</Text>
            <Text style={[styles.bottomNavLabel, screen === item.id && styles.bottomNavLabelSelected]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>}

      {toast !== '' && <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>}
      <CheckoutModal
        visible={checkoutVisible}
        items={cartItems}
        quantity={cart}
        total={total}
        dealer={isDealer}
        onClose={() => setCheckoutVisible(false)}
        onQuantity={changeQuantity}
        onCheckout={placeOrder}
        onShop={() => { setCheckoutVisible(false); selectScreen('shop'); }}
      />
    </View>
  );
}

function HomeScreen({
  onShop, onService, onAdd, priceFor, cardWidth, compact,
}: {
  onShop: () => void;
  onService: () => void;
  onAdd: (product: Product) => void;
  priceFor: (product: Product) => number;
  cardWidth: CardWidth;
  compact: boolean;
}) {
  const popular = products.filter((product) => ['AP-001', 'AP-034', 'AP-023', 'AP-011'].includes(product.id));
  return (
    <View>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
          <View style={styles.heroEyebrow}><View style={styles.eyebrowDot} /><Text style={styles.heroEyebrowText}>A BETTER WAY TO DRINK</Text></View>
          <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Pure water.{'\n'}Clear living.</Text>
          <Text style={styles.heroDescription}>Thoughtfully designed water care for every home. Find your kind of pure.</Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.primaryButton} onPress={onShop}><Text style={styles.primaryButtonText}>Explore products  →</Text></Pressable>
            <Pressable style={styles.textButton} onPress={onService}><Text style={styles.textButtonText}>Book a service</Text></Pressable>
          </View>
          <View style={styles.heroTrust}><Text style={styles.trustStars}>★★★★★</Text><Text style={styles.trustText}>Trusted by 25,000+ homes</Text></View>
        </View>
        <View style={[styles.heroVisual, compact && styles.heroVisualCompact]}>
          <View style={[styles.heroPhotoFrame, compact && styles.heroPhotoFrameCompact]}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1000&q=85' }}
              style={styles.heroPhoto}
              resizeMode="cover"
            />
            <View style={styles.photoLabel}><Text style={styles.photoLabelIcon}>✦</Text><View><Text style={styles.photoLabelTitle}>Made for better days</Text><Text style={styles.photoLabelSub}>Advanced 7-stage purification</Text></View></View>
          </View>
          <View style={styles.floatingBadge}><Text style={styles.floatingIcon}>◉</Text><View><Text style={styles.floatingNumber}>99.9%</Text><Text style={styles.floatingCaption}>IMPURITIES REMOVED</Text></View></View>
        </View>
        <View style={styles.heroBlob} />
      </View>

      <View style={[styles.benefitStrip, compact && styles.benefitStripCompact]}>
        <Benefit icon="✳" title="Pure by design" detail="7-stage filtration" />
        <Benefit icon="⌁" title="Care that lasts" detail="Doorstep service" />
        <Benefit icon="♧" title="Made responsibly" detail="Thoughtful materials" />
      </View>

      <View style={[styles.sectionHeading, compact && styles.sectionHeadingCompact]}>
        <View><Text style={styles.sectionEyebrow}>A LITTLE SOMETHING FOR EVERY DROP</Text><Text style={styles.sectionTitle}>Find your perfect fit</Text></View>
        <Pressable onPress={onShop}><Text style={styles.linkText}>View all products  →</Text></Pressable>
      </View>
      <View style={styles.quickCategories}>
        {[
          { icon: '💧', name: 'Purifiers', note: 'From ₹6,990', tint: '#eaf6fb' },
          { icon: '🚰', name: 'Dispensers', note: 'From ₹5,490', tint: '#edf6f4' },
          { icon: '⚙️', name: 'Pumps', note: 'From ₹1,790', tint: '#f1f2f6' },
          { icon: '🧪', name: 'Filters', note: 'From ₹390', tint: '#f1f6ec' },
        ].map((item) => (
          <Pressable key={item.name} style={[styles.quickCategory, { backgroundColor: item.tint }]} onPress={onShop}>
            <Text style={styles.quickCategoryIcon}>{item.icon}</Text><Text style={styles.quickCategoryTitle}>{item.name}</Text><Text style={styles.quickCategoryNote}>{item.note}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.sectionHeading, styles.popularHeading, compact && styles.sectionHeadingCompact]}>
        <View><Text style={styles.sectionEyebrow}>CUSTOMER FAVOURITES</Text><Text style={styles.sectionTitle}>Loved for a reason</Text></View>
        <Pressable onPress={onShop}><Text style={styles.linkText}>Shop the collection  →</Text></Pressable>
      </View>
      <View style={styles.productGrid}>{popular.map((product) => (
        <ProductCard key={product.id} product={product} price={priceFor(product)} cardWidth={cardWidth} onAdd={() => onAdd(product)} />
      ))}</View>
      <View style={[styles.serviceCallout, compact && styles.serviceCalloutCompact]}>
        <View style={styles.serviceCalloutIcon}><Text>✳</Text></View>
        <View style={styles.serviceCalloutCopy}><Text style={styles.serviceCalloutTitle}>Your purifier deserves a little care.</Text><Text style={styles.serviceCalloutText}>Book a certified technician, right at your doorstep.</Text></View>
        <Pressable style={styles.outlineButton} onPress={onService}><Text style={styles.outlineButtonText}>Book a service  →</Text></Pressable>
      </View>
    </View>
  );
}

function Benefit({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return <View style={styles.benefit}><Text style={styles.benefitIcon}>{icon}</Text><View><Text style={styles.benefitTitle}>{title}</Text><Text style={styles.benefitDetail}>{detail}</Text></View></View>;
}

function ShopScreen({
  products: visibleProducts, category, setCategory, query, setQuery, onAdd, priceFor, cardWidth,
}: {
  products: Product[];
  category: Category | 'All';
  setCategory: (category: Category | 'All') => void;
  query: string;
  setQuery: (query: string) => void;
  onAdd: (product: Product) => void;
  priceFor: (product: Product) => number;
  cardWidth: CardWidth;
}) {
  return (
    <View style={styles.shopScreen}>
      <View style={styles.pageHeading}><Text style={styles.sectionEyebrow}>THE AQUAPURE COLLECTION</Text><Text style={styles.pageTitle}>Good water starts here.</Text><Text style={styles.pageSubtitle}>Everyday essentials for water that feels just right.</Text></View>
      <View style={styles.searchBar}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search purifiers, filters, spares..." placeholderTextColor="#91A0AA" style={styles.searchInput} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filterChip, category === item && styles.filterChipActive]}><Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.resultsLine}><Text style={styles.resultsText}>{visibleProducts.length} thoughtfully chosen essentials</Text><Text style={styles.sortText}>Sort: Featured⌄</Text></View>
      {visibleProducts.length > 0 ? (
        <View style={styles.productGrid}>{visibleProducts.map((product) => <ProductCard key={product.id} product={product} price={priceFor(product)} cardWidth={cardWidth} onAdd={() => onAdd(product)} />)}</View>
      ) : <View style={styles.emptyState}><Text style={styles.emptyIcon}>⌕</Text><Text style={styles.emptyTitle}>Nothing found just yet</Text><Text style={styles.emptyText}>Try another name or category.</Text></View>}
    </View>
  );
}

type CardWidth = '23.5%' | '31.5%' | '48.5%';

function ProductCard({ product, price, cardWidth, onAdd }: { product: Product; price: number; cardWidth: CardWidth; onAdd: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <View style={[styles.productCard, { width: cardWidth }]}>
      <View style={[styles.productImageWrap, { backgroundColor: product.tint }]}>
        {!imageFailed ? <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" onError={() => setImageFailed(true)} /> : <Text style={styles.productFallback}>{product.icon}</Text>}
        {product.badge && <View style={styles.productBadge}><Text style={styles.productBadgeText}>{product.badge}</Text></View>}
        <Pressable accessibilityLabel={`Add ${product.name} to wishlist`} style={styles.wishlistButton} onPress={() => {}}><Text style={styles.wishlistIcon}>♡</Text></Pressable>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{product.category.toUpperCase()}  ·  {product.id}</Text>
        <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
        <View style={styles.ratingLine}><Text style={styles.ratingStar}>★</Text><Text style={styles.ratingValue}>{product.rating}</Text><Text style={styles.reviewCount}>({product.reviews})</Text></View>
        <View style={styles.productBottom}><Text style={styles.productPrice}>{formatPrice(price)}</Text><Pressable accessibilityLabel={`Add ${product.name} to bag`} onPress={onAdd} style={styles.addButton}><Text style={styles.addButtonText}>+</Text></Pressable></View>
      </View>
    </View>
  );
}

function ServiceScreen({
  serviceType, setServiceType, serviceDate, setServiceDate, serviceAddress, setServiceAddress, onBook, onOrder,
}: {
  serviceType: string;
  setServiceType: (type: string) => void;
  serviceDate: string;
  setServiceDate: (date: string) => void;
  serviceAddress: string;
  setServiceAddress: (address: string) => void;
  onBook: () => void;
  onOrder: () => void;
}) {
  const serviceOptions = ['Routine maintenance', 'Filter replacement', 'Repair visit', 'Installation'];
  return (
    <View>
      <View style={styles.pageHeading}><Text style={styles.sectionEyebrow}>HERE WHEN YOU NEED US</Text><Text style={styles.pageTitle}>Care, right at home.</Text><Text style={styles.pageSubtitle}>Certified technicians. Genuine parts. A little peace of mind.</Text></View>
      <View style={styles.serviceLayout}>
        <View style={styles.serviceForm}>
          <Text style={styles.formTitle}>Book a service visit</Text>
          <Text style={styles.formHint}>Tell us what you need and we’ll take it from here.</Text>
          <Text style={styles.inputLabel}>WHAT CAN WE HELP WITH?</Text>
          <View style={styles.serviceOptions}>{serviceOptions.map((option) => (
            <Pressable key={option} onPress={() => setServiceType(option)} style={[styles.serviceOption, serviceType === option && styles.serviceOptionActive]}>
              <Text style={[styles.serviceOptionText, serviceType === option && styles.serviceOptionTextActive]}>{option}</Text>
            </Pressable>
          ))}</View>
          <Text style={styles.inputLabel}>PREFERRED DATE & TIME</Text>
          <TextInput value={serviceDate} onChangeText={setServiceDate} placeholder="e.g. 26 Oct, 10:00 AM" placeholderTextColor="#91A0AA" style={styles.formInput} />
          <Text style={styles.inputLabel}>SERVICE ADDRESS</Text>
          <TextInput value={serviceAddress} onChangeText={setServiceAddress} placeholder="Enter your address" placeholderTextColor="#91A0AA" style={styles.formInput} />
          <Pressable style={styles.primaryButton} onPress={onBook}><Text style={styles.primaryButtonText}>Request a visit  →</Text></Pressable>
          <Text style={styles.formFootnote}>No payment required now. Our team will confirm your slot by phone.</Text>
        </View>
        <View style={styles.serviceAside}>
          <View style={styles.serviceAsideArt}><Text style={styles.serviceAsideDrop}>💧</Text><Text style={styles.serviceAsideSpark}>✦</Text></View>
          <Text style={styles.serviceAsideTitle}>A little care goes a long way.</Text>
          <Text style={styles.serviceAsideText}>Regular maintenance keeps your purifier working at its best and your water tasting fresh.</Text>
          <View style={styles.servicePromise}><Text style={styles.promiseTick}>✓</Text><Text style={styles.promiseText}>Background-checked technicians</Text></View>
          <View style={styles.servicePromise}><Text style={styles.promiseTick}>✓</Text><Text style={styles.promiseText}>Genuine AquaPure spare parts</Text></View>
          <View style={styles.servicePromise}><Text style={styles.promiseTick}>✓</Text><Text style={styles.promiseText}>Service warranty included</Text></View>
          <Pressable onPress={onOrder}><Text style={styles.linkText}>View your orders  →</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function OrdersScreen({ orders }: { orders: Order[] }) {
  return (
    <View>
      <View style={styles.pageHeading}><Text style={styles.sectionEyebrow}>YOUR AQUAPURE JOURNEY</Text><Text style={styles.pageTitle}>Orders, at a glance.</Text><Text style={styles.pageSubtitle}>A little update on everything you’ve ordered.</Text></View>
      {orders.map((order) => <OrderCard key={order.id} order={order} />)}
      {orders.length === 0 && <View style={styles.emptyState}><Text style={styles.emptyTitle}>Your next favourite is waiting</Text><Text style={styles.emptyText}>Orders will appear here when you check out.</Text></View>}
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderMain}>
        <View style={styles.orderIcon}><Text>◫</Text></View>
        <View style={styles.orderMeta}><Text style={styles.orderId}>ORDER {order.id}</Text><Text style={styles.orderDate}>{order.date}  ·  {order.items} item{order.items === 1 ? '' : 's'}</Text></View>
      </View>
      <View style={styles.orderDetails}><Text style={styles.orderTotal}>{formatPrice(order.total)}</Text><View style={[styles.statusPill, statusStyle(order.status)]}><Text style={styles.statusPillText}>{order.status}</Text></View></View>
      <Pressable style={styles.orderAction}><Text style={styles.orderActionText}>Track order  →</Text></Pressable>
    </View>
  );
}

function statusStyle(status: string) {
  if (status === 'Delivered') return { backgroundColor: '#e9f5eb' };
  if (status === 'Shipped') return { backgroundColor: '#eaf3f8' };
  if (status === 'Confirmed') return { backgroundColor: '#fff4df' };
  return { backgroundColor: '#f3f0ea' };
}

function ProfileScreen({ role, onRole, onOrders, onService }: { role: Role; onRole: () => void; onOrders: () => void; onService: () => void }) {
  return (
    <View>
      <View style={styles.pageHeading}><Text style={styles.sectionEyebrow}>YOUR AQUAPURE SPACE</Text><Text style={styles.pageTitle}>A little about you.</Text></View>
      <View style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>A</Text></View><View style={styles.profileInfo}><Text style={styles.profileName}>Aarav Sharma</Text><Text style={styles.profileEmail}>aarav.sharma@example.com</Text><View style={styles.profileRole}><Text style={styles.profileRoleText}>{role} demo account</Text></View></View><Pressable style={styles.editButton}><Text style={styles.editButtonText}>Edit profile</Text></Pressable></View>
      <View style={styles.profileGrid}>
        <Pressable onPress={onOrders} style={styles.profileMenuCard}><Text style={styles.profileMenuIcon}>▤</Text><Text style={styles.profileMenuTitle}>My orders</Text><Text style={styles.profileMenuDetail}>Track deliveries and view past orders</Text><Text style={styles.linkText}>View orders  →</Text></Pressable>
        <Pressable onPress={onService} style={styles.profileMenuCard}><Text style={styles.profileMenuIcon}>✳</Text><Text style={styles.profileMenuTitle}>Service & support</Text><Text style={styles.profileMenuDetail}>Book a visit or get help with a product</Text><Text style={styles.linkText}>Get support  →</Text></Pressable>
        <Pressable onPress={onRole} style={styles.profileMenuCard}><Text style={styles.profileMenuIcon}>⇄</Text><Text style={styles.profileMenuTitle}>Switch demo role</Text><Text style={styles.profileMenuDetail}>Preview the dealer or admin experience</Text><Text style={styles.linkText}>Change role  →</Text></Pressable>
      </View>
      <View style={styles.demoNote}><Text style={styles.demoNoteTitle}>Demo account</Text><Text style={styles.demoNoteText}>Sign-in and profile details are illustrative. Connect Firebase Auth to enable real customer accounts.</Text></View>
    </View>
  );
}

function AdminScreen({
  orders,
  services,
  dealerApplications,
  onOrderStatus,
  onServiceStatus,
  onDealerDecision,
}: {
  orders: Order[];
  services: ServiceRequest[];
  dealerApplications: Array<{ id: string; name: string; city: string; status: 'Pending' | 'Approved' | 'Rejected' }>;
  onOrderStatus: (id: string) => Promise<void>;
  onServiceStatus: (id: string) => Promise<void>;
  onDealerDecision: (id: string, status: 'Approved' | 'Rejected') => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<'Orders' | 'Dealers' | 'Service desk'>('Orders');
  const orderValue = orders.reduce((sum, order) => sum + order.total, 0);
  const openOrders = orders.filter((order) => order.status !== 'Delivered').length;
  const activeDealers = dealerApplications.filter((dealer) => dealer.status === 'Approved').length;
  const adminDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
  return (
    <View>
      <View style={styles.adminWelcome}><View><Text style={styles.adminEyebrow}>AQUAPURE OPERATIONS</Text><Text style={styles.adminTitle}>Good morning, Admin.</Text><Text style={styles.adminSubtitle}>Here’s what’s happening across your store today.</Text></View><View style={styles.adminDate}><Text style={styles.adminDateText}>{adminDate}</Text></View></View>
      <View style={styles.metricGrid}>
        <Metric label="RECORDED ORDER VALUE" value={formatPrice(orderValue)} delta={`${orders.length} recorded orders`} icon="↗" tint="#eaf6fb" />
        <Metric label="OPEN ORDERS" value={String(openOrders)} delta={`${orders.length - openOrders} delivered`} icon="▤" tint="#fff3e4" />
        <Metric label="ACTIVE DEALERS" value={String(activeDealers)} delta={`${dealerApplications.filter((dealer) => dealer.status === 'Pending').length} pending approval`} icon="♙" tint="#f2effb" />
        <Metric label="SERVICE REQUESTS" value={String(services.length)} delta={`${services.filter((service) => service.status === 'Scheduled').length} scheduled`} icon="✳" tint="#edf6ef" />
      </View>
      <View style={styles.adminTabs}>{(['Orders', 'Dealers', 'Service desk'] as const).map((tab) => <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.adminTab, activeTab === tab && styles.adminTabActive]}><Text style={[styles.adminTabText, activeTab === tab && styles.adminTabTextActive]}>{tab}</Text></Pressable>)}</View>
      {activeTab === 'Orders' && <View style={styles.adminPanel}><View style={styles.panelHeading}><View><Text style={styles.panelTitle}>Recent orders</Text><Text style={styles.panelSub}>Manage customer and dealer orders</Text></View><Text style={styles.panelLink}>View all  →</Text></View>
        {orders.map((order) => <View key={order.id} style={styles.adminRow}><View style={styles.adminOrderMark}><Text>◫</Text></View><View style={styles.adminRowMain}><Text style={styles.adminRowTitle}>{order.id} · {order.customer}</Text><Text style={styles.adminRowSub}>{order.items} item{order.items === 1 ? '' : 's'}  ·  {order.date}</Text></View><Text style={styles.adminRowTotal}>{formatPrice(order.total)}</Text><Pressable onPress={() => { void onOrderStatus(order.id); }} style={[styles.statusPill, statusStyle(order.status)]}><Text style={styles.statusPillText}>{order.status}  ↻</Text></Pressable></View>)}
      </View>}
      {activeTab === 'Dealers' && <View style={styles.adminPanel}><View style={styles.panelHeading}><View><Text style={styles.panelTitle}>Dealer applications</Text><Text style={styles.panelSub}>Review and approve new trade partners</Text></View><View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>{dealerApplications.filter((dealer) => dealer.status === 'Pending').length} PENDING</Text></View></View>
        {dealerApplications.map((dealer, index) => {
          const initials = dealer.name.split(' ').map((word) => word[0]).slice(0, 2).join('');
          const tint = ['#eaf6fb', '#f1f6ec', '#f6eff5'][index % 3];
          return <View key={dealer.id} style={styles.dealerRow}><View style={[styles.dealerInitials, { backgroundColor: tint }]}><Text style={styles.dealerInitialsText}>{initials}</Text></View><View style={styles.adminRowMain}><Text style={styles.adminRowTitle}>{dealer.name}</Text><Text style={styles.adminRowSub}>{dealer.city}  ·  {dealer.id}</Text></View>{dealer.status === 'Pending' ? <><Pressable onPress={() => { void onDealerDecision(dealer.id, 'Approved'); }} style={styles.approveButton}><Text style={styles.approveButtonText}>Approve</Text></Pressable><Pressable onPress={() => { void onDealerDecision(dealer.id, 'Rejected'); }} style={styles.declineButton}><Text style={styles.declineButtonText}>Reject</Text></Pressable></> : <View style={[styles.statusPill, dealer.status === 'Approved' ? { backgroundColor: '#e9f5eb' } : { backgroundColor: '#f8ecea' }]}><Text style={styles.statusPillText}>{dealer.status}</Text></View>}</View>;
        })}
      </View>}
      {activeTab === 'Service desk' && <View style={styles.adminPanel}><View style={styles.panelHeading}><View><Text style={styles.panelTitle}>Service desk</Text><Text style={styles.panelSub}>Upcoming appointments and requests</Text></View><Text style={styles.panelLink}>View calendar  →</Text></View>
        {services.map((service) => <View key={service.id} style={styles.adminRow}><View style={styles.serviceRowIcon}><Text>✳</Text></View><View style={styles.adminRowMain}><Text style={styles.adminRowTitle}>{service.name} · {service.service}</Text><Text style={styles.adminRowSub}>{service.id}  ·  {service.date}</Text></View><Pressable onPress={() => { void onServiceStatus(service.id); }} style={[styles.statusPill, service.status === 'Scheduled' ? { backgroundColor: '#e9f5eb' } : { backgroundColor: '#fff4df' }]}><Text style={styles.statusPillText}>{service.status}  ↻</Text></Pressable></View>)}
      </View>}
      <View style={styles.adminFootnote}><Text style={styles.adminFootnoteText}>Demo dashboard · Changes are held in this session only. Connect Firestore for shared live operations.</Text></View>
    </View>
  );
}

function Metric({ label, value, delta, icon, tint }: { label: string; value: string; delta: string; icon: string; tint: string }) {
  return <View style={styles.metricCard}><View style={styles.metricTop}><Text style={styles.metricLabel}>{label}</Text><View style={[styles.metricIcon, { backgroundColor: tint }]}><Text style={styles.metricIconText}>{icon}</Text></View></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricDelta}>{delta}</Text></View>;
}

function CheckoutModal({
  visible, items, quantity, total, dealer, onClose, onQuantity, onCheckout, onShop,
}: {
  visible: boolean;
  items: Product[];
  quantity: Record<string, number>;
  total: number;
  dealer: boolean;
  onClose: () => void;
  onQuantity: (id: string, delta: number) => void;
  onCheckout: (details: { customerName: string; phone: string; address: string; paymentMethod: 'UPI' | 'Cash on delivery' }) => void | Promise<void>;
  onShop: () => void;
}) {
  const [customerName, setCustomerName] = useState('Aarav Sharma');
  const [phone, setPhone] = useState('98765 43210');
  const [address, setAddress] = useState('12 Palm Grove Road, Bengaluru');
  const [payment, setPayment] = useState<'UPI' | 'Cash on delivery'>('UPI');
  const [error, setError] = useState('');

  const submitOrder = () => {
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      setError('Add your name, phone number, and delivery address to continue.');
      return;
    }
    setError('');
    if (!phone.trim() || !address.trim()) {
      setError('Add your phone number and delivery address to continue.');
      return;
    }
    void onCheckout({ customerName, phone, address, paymentMethod: payment });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.cartSheet}>
        <View style={styles.cartHeader}><View><Text style={styles.cartTitle}>Your bag</Text><Text style={styles.cartSubtitle}>{items.length ? `${Object.values(quantity).reduce((sum, count) => sum + count, 0)} lovely thing${Object.values(quantity).reduce((sum, count) => sum + count, 0) === 1 ? '' : 's'} inside` : 'A little room for something good'}</Text></View><Pressable onPress={onClose} style={styles.closeButton}><Text style={styles.closeButtonText}>×</Text></Pressable></View>
        {items.length ? <>
          <ScrollView style={styles.cartItemsScroll}>{items.map((product) => (
            <View key={product.id} style={styles.cartItem}>
              <View style={[styles.cartItemThumb, { backgroundColor: product.tint }]}><Text>{product.icon}</Text></View>
              <View style={styles.cartItemCopy}><Text style={styles.cartItemTitle}>{product.name}</Text><Text style={styles.cartItemType}>{product.category}  ·  {product.id}</Text><Text style={styles.cartItemPrice}>{formatPrice((dealer ? product.dealerPrice : product.price) * quantity[product.id])}</Text></View>
              <View style={styles.quantityControl}><Pressable onPress={() => onQuantity(product.id, -1)} style={styles.quantityButton}><Text>−</Text></Pressable><Text style={styles.quantityText}>{quantity[product.id]}</Text><Pressable onPress={() => onQuantity(product.id, 1)} style={styles.quantityButton}><Text>+</Text></Pressable></View>
            </View>
          ))}</ScrollView>
          <View style={styles.checkoutDetails}>
            <Text style={styles.checkoutHeading}>Delivery details</Text>
            <View style={styles.checkoutFields}>
              <TextInput accessibilityLabel="Full name" value={customerName} onChangeText={setCustomerName} placeholder="Full name" style={styles.checkoutInput} />
              <TextInput accessibilityLabel="Phone number" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" style={styles.checkoutInput} />
            </View>
            <TextInput accessibilityLabel="Delivery address" value={address} onChangeText={setAddress} placeholder="Delivery address" style={styles.checkoutInput} />
            <Text style={styles.checkoutHeading}>Payment method</Text>
            <View style={styles.paymentOptions}>
              {(['UPI', 'Cash on delivery'] as const).map((option) => (
                <Pressable key={option} onPress={() => setPayment(option)} style={[styles.paymentOption, payment === option && styles.paymentOptionSelected]}>
                  <Text style={[styles.paymentOptionText, payment === option && styles.paymentOptionTextSelected]}>{payment === option ? '● ' : '○ '}{option}</Text>
                </Pressable>
              ))}
            </View>
            {error !== '' && <Text style={styles.checkoutError}>{error}</Text>}
          </View>
          <View style={styles.cartSummary}><View style={styles.summaryLine}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{formatPrice(total)}</Text></View><View style={styles.summaryLine}><Text style={styles.summaryLabel}>Delivery</Text><Text style={styles.freeDelivery}>FREE</Text></View><View style={[styles.summaryLine, styles.totalLine]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{formatPrice(total)}</Text></View><Pressable style={styles.primaryButton} onPress={submitOrder}><Text style={styles.primaryButtonText}>Place demo order  →</Text></Pressable><Text style={styles.checkoutNote}>Secure checkout · Payments are demo-only</Text></View>
        </> : <View style={styles.emptyCart}><View style={styles.emptyCartIcon}><Text>♧</Text></View><Text style={styles.emptyTitle}>Your bag is taking a breather</Text><Text style={styles.emptyText}>Discover something to make your water routine a little better.</Text><Pressable style={styles.primaryButton} onPress={onShop}><Text style={styles.primaryButtonText}>Explore products  →</Text></Pressable></View>}
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#FBFCFA' },
  topBar: { height: 78, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#E9EEEF', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 5 },
  topBarCompact: { height: 66, paddingHorizontal: 13 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#EAF6F7', alignItems: 'center', justifyContent: 'center' },
  brandDrop: { color: blue, fontSize: 16 },
  brandName: { color: navy, fontSize: 21, fontWeight: '800', letterSpacing: -1 } as object,
  brandAccent: { color: blue },
  brandCaption: { color: '#8A9AA3', fontSize: 8, letterSpacing: 1.5, fontWeight: '700', marginTop: 2 },
  desktopNav: { flexDirection: 'row', alignItems: 'center', gap: 29 },
  topNavItem: { paddingVertical: 28 },
  topNavText: { color: '#687C89', fontSize: 13, fontWeight: '600' },
  topNavActive: { color: blue },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bagButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F4F8F8', position: 'relative' },
  bagIcon: { color: navy, fontSize: 20 },
  bagCount: { position: 'absolute', right: -3, top: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: blue, alignItems: 'center', justifyContent: 'center' },
  bagCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F1F7F6', paddingVertical: 10, paddingHorizontal: 13, borderRadius: 30 },
  adminPill: { backgroundColor: '#F1EFF8' },
  roleDot: { color: '#39A27B', fontSize: 9 },
  roleText: { color: navy, fontSize: 12, fontWeight: '700' },
  menuButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', display: 'none' },
  menuButtonVisible: { display: 'flex' },
  hidden: { display: 'none' },
  menuIcon: { color: navy, fontSize: 19 },
  mobileMenu: { position: 'absolute', right: 16, top: 70, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EEEF', borderRadius: 15, padding: 8, zIndex: 10, minWidth: 190, shadowColor: '#173548', shadowOpacity: 0.12, shadowRadius: 18, elevation: 6 },
  mobileMenuItem: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 12 },
  mobileMenuIcon: { width: 20, textAlign: 'center', color: blue, fontSize: 16 },
  mobileMenuText: { color: navy, fontSize: 13, fontWeight: '600' },
  pageScroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 45 },
  scrollContentCompact: { paddingHorizontal: 14, paddingBottom: 20 },
  content: { width: '100%' },
  dealerBanner: { marginTop: 16, marginBottom: -2, padding: 12, borderRadius: 12, backgroundColor: '#EEF7F5', flexDirection: 'row', gap: 10, alignItems: 'center' },
  dealerBannerText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#19735F' },
  dealerBannerHint: { color: '#557A75', fontSize: 12 },
  hero: { minHeight: 430, backgroundColor: '#F0F7F7', borderRadius: 24, marginTop: 24, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 50, paddingVertical: 40, position: 'relative' },
  heroCompact: { minHeight: 0, marginTop: 14, paddingHorizontal: 22, paddingVertical: 25, flexDirection: 'column', alignItems: 'stretch', borderRadius: 19 },
  heroCopy: { flex: 1, zIndex: 1, paddingRight: 18 },
  heroCopyCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingRight: 0 },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: '#54A98E' },
  heroEyebrowText: { color: '#54817E', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  heroTitle: { color: navy, fontSize: 53, lineHeight: 59, fontWeight: '700', letterSpacing: -2.2 },
  heroTitleCompact: { fontSize: 40, lineHeight: 44, letterSpacing: -1.5 },
  heroDescription: { maxWidth: 390, color: '#667C87', fontSize: 15, lineHeight: 24, marginTop: 15 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 24, flexWrap: 'wrap' },
  primaryButton: { minHeight: 47, backgroundColor: navy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  textButton: { paddingVertical: 12 },
  textButtonText: { color: navy, fontSize: 13, fontWeight: '700' },
  heroTrust: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 25 },
  trustStars: { color: '#DE9F48', fontSize: 12, letterSpacing: 1 },
  trustText: { color: '#758895', fontSize: 11 },
  heroVisual: { flex: 0.9, minWidth: 280, height: 345, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  heroVisualCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, width: '100%', height: 230, marginTop: 22 },
  heroPhotoFrame: { width: '86%', height: 310, borderRadius: 100, overflow: 'hidden', borderWidth: 8, borderColor: '#FFFFFF', transform: [{ rotate: '2deg' }] },
  heroPhotoFrameCompact: { height: 205 },
  heroPhoto: { width: '100%', height: '100%' },
  photoLabel: { position: 'absolute', left: 15, right: 15, bottom: 15, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  photoLabelIcon: { color: '#4AA28E', fontSize: 18 },
  photoLabelTitle: { color: navy, fontSize: 11, fontWeight: '700' },
  photoLabelSub: { color: muted, fontSize: 9, marginTop: 3 },
  floatingBadge: { position: 'absolute', right: -1, top: 25, padding: 13, backgroundColor: '#FFFFFF', borderRadius: 14, flexDirection: 'row', gap: 9, alignItems: 'center', shadowColor: navy, shadowOpacity: 0.1, shadowRadius: 15, elevation: 3 },
  floatingIcon: { color: '#48A28C', fontSize: 20 },
  floatingNumber: { color: navy, fontSize: 16, fontWeight: '800' },
  floatingCaption: { color: muted, fontSize: 7, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },
  heroBlob: { position: 'absolute', width: 390, height: 390, borderRadius: 200, right: 60, bottom: -250, backgroundColor: '#E1EEEE' },
  benefitStrip: { minHeight: 94, paddingVertical: 20, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#E7EEEE', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  benefitStripCompact: { justifyContent: 'flex-start', flexWrap: 'wrap', gap: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 155 },
  benefitIcon: { width: 40, height: 40, backgroundColor: '#EFF7F5', borderRadius: 13, color: '#397E75', fontSize: 18, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', paddingTop: 9 },
  benefitTitle: { color: navy, fontWeight: '700', fontSize: 12 },
  benefitDetail: { color: muted, fontSize: 10, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 54, marginBottom: 23 },
  sectionHeadingCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 10, marginTop: 37 },
  sectionEyebrow: { color: '#76908F', fontSize: 9, fontWeight: '800', letterSpacing: 1.65, marginBottom: 9 },
  sectionTitle: { color: navy, fontSize: 27, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 },
  linkText: { color: blue, fontSize: 12, fontWeight: '700', paddingBottom: 4 },
  quickCategories: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 13 },
  quickCategory: { flexGrow: 1, flexBasis: '22%', minWidth: 145, height: 135, borderRadius: 16, padding: 17, justifyContent: 'space-between' },
  quickCategoryIcon: { fontSize: 24 },
  quickCategoryTitle: { color: navy, fontSize: 14, fontWeight: '700' },
  quickCategoryNote: { color: muted, fontSize: 10 },
  popularHeading: { marginTop: 58 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18, columnGap: 0 },
  productCard: { borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF1F0', overflow: 'hidden', marginBottom: 2 },
  productImageWrap: { height: 155, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  productImage: { width: '100%', height: '100%' },
  productFallback: { fontSize: 48 },
  productBadge: { position: 'absolute', left: 10, top: 10, backgroundColor: '#FFFFFF', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 7 },
  productBadgeText: { color: '#437E75', fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  wishlistButton: { position: 'absolute', right: 10, top: 10, width: 29, height: 29, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  wishlistIcon: { color: navy, fontSize: 17, marginTop: -2 },
  productInfo: { padding: 13 },
  productCategory: { color: '#81969C', fontSize: 8, fontWeight: '800', letterSpacing: 0.9 },
  productName: { color: navy, fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 7, minHeight: 36 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingStar: { color: '#DDA34E', fontSize: 11 },
  ratingValue: { color: '#485F6C', fontSize: 10, fontWeight: '700' },
  reviewCount: { color: '#98A5AA', fontSize: 9 },
  productBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  productPrice: { color: navy, fontSize: 15, fontWeight: '800' },
  addButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontSize: 22, lineHeight: 25 },
  serviceCallout: { backgroundColor: '#EFF6F3', borderRadius: 18, padding: 20, marginTop: 55, flexDirection: 'row', alignItems: 'center', gap: 17 },
  serviceCalloutCompact: { flexWrap: 'wrap', padding: 16, marginTop: 36 },
  serviceCalloutIcon: { width: 46, height: 46, backgroundColor: '#FFFFFF', borderRadius: 15, alignItems: 'center', justifyContent: 'center', color: '#428C78', fontSize: 18 },
  serviceCalloutCopy: { flex: 1 },
  serviceCalloutTitle: { color: navy, fontSize: 14, fontWeight: '700' },
  serviceCalloutText: { color: muted, fontSize: 11, marginTop: 5 },
  outlineButton: { borderWidth: 1, borderColor: '#AAC9C2', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10 },
  outlineButtonText: { color: '#296B62', fontSize: 11, fontWeight: '700' },
  shopScreen: { paddingTop: 30 },
  pageHeading: { paddingTop: 18, paddingBottom: 24 },
  pageTitle: { color: navy, fontSize: 34, fontWeight: '700', letterSpacing: -1.2 },
  pageSubtitle: { color: muted, fontSize: 13, lineHeight: 21, marginTop: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4EAEA', backgroundColor: '#FFFFFF', borderRadius: 12, height: 48, paddingHorizontal: 14 },
  searchIcon: { color: '#6B8891', fontSize: 24, marginRight: 8 },
  searchInput: { flex: 1, color: navy, fontSize: 13, outlineStyle: 'none' } as object,
  filterRow: { flexDirection: 'row', gap: 9, paddingVertical: 17 },
  filterChip: { borderWidth: 1, borderColor: '#E4EBEA', backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 25 },
  filterChipActive: { backgroundColor: navy, borderColor: navy },
  filterText: { color: '#5F7380', fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  resultsLine: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 13 },
  resultsText: { color: muted, fontSize: 11 },
  sortText: { color: '#5F7380', fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 50 },
  emptyIcon: { color: blue, fontSize: 32 },
  emptyTitle: { color: navy, fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptyText: { color: muted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 7, maxWidth: 270 },
  serviceLayout: { flexDirection: 'row', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' },
  serviceForm: { flexGrow: 1, flexBasis: 420, maxWidth: 690, borderWidth: 1, borderColor: '#E9EFEE', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24 },
  formTitle: { color: navy, fontSize: 19, fontWeight: '700' },
  formHint: { color: muted, fontSize: 12, marginTop: 7, marginBottom: 23 },
  inputLabel: { color: '#71858C', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: 17, marginBottom: 9 },
  serviceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceOption: { borderRadius: 9, borderWidth: 1, borderColor: '#E6ECEB', paddingVertical: 10, paddingHorizontal: 11 },
  serviceOptionActive: { backgroundColor: '#EAF5F2', borderColor: '#83B9AB' },
  serviceOptionText: { color: '#647A83', fontSize: 10, fontWeight: '600' },
  serviceOptionTextActive: { color: '#286F62' },
  formInput: { height: 44, borderWidth: 1, borderColor: '#E4EAEA', borderRadius: 9, paddingHorizontal: 12, color: navy, fontSize: 12, outlineStyle: 'none' } as object,
  formFootnote: { color: '#8A9AA0', fontSize: 9, marginTop: 12, textAlign: 'center' },
  serviceAside: { flexGrow: 1, flexBasis: 255, maxWidth: 390, backgroundColor: '#F0F7F5', borderRadius: 17, padding: 22 },
  serviceAsideArt: { height: 96, backgroundColor: '#E0EEEA', borderRadius: 13, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  serviceAsideDrop: { fontSize: 37 },
  serviceAsideSpark: { position: 'absolute', right: 35, top: 20, color: '#63A799', fontSize: 20 },
  serviceAsideTitle: { color: navy, fontSize: 17, fontWeight: '700', marginTop: 18 },
  serviceAsideText: { color: muted, fontSize: 11, lineHeight: 19, marginTop: 8, marginBottom: 14 },
  servicePromise: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 11 },
  promiseTick: { width: 18, height: 18, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', backgroundColor: '#D9ECE5', borderRadius: 10, color: '#34856D', fontSize: 10, fontWeight: '800' },
  promiseText: { color: '#58736F', fontSize: 10 },
  orderCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EFEE', borderRadius: 15, padding: 17, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  orderMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  orderIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#EDF6F5', alignItems: 'center', justifyContent: 'center', color: blue },
  orderMeta: { gap: 5 },
  orderId: { color: navy, fontSize: 12, fontWeight: '800' },
  orderDate: { color: muted, fontSize: 10 },
  orderDetails: { alignItems: 'flex-end', gap: 7 },
  orderTotal: { color: navy, fontSize: 13, fontWeight: '800' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { color: '#4F6E70', fontSize: 9, fontWeight: '700' },
  orderAction: { padding: 7 },
  orderActionText: { color: blue, fontSize: 10, fontWeight: '700' },
  profileCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EFEE', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  profileAvatar: { width: 54, height: 54, backgroundColor: '#E5F1EE', borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#367D72', fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, minWidth: 170 },
  profileName: { color: navy, fontSize: 16, fontWeight: '700' },
  profileEmail: { color: muted, fontSize: 11, marginTop: 4 },
  profileRole: { alignSelf: 'flex-start', backgroundColor: '#F0F6F4', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, marginTop: 7 },
  profileRoleText: { color: '#417B71', fontSize: 9, fontWeight: '700' },
  editButton: { borderWidth: 1, borderColor: '#DDE7E5', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9 },
  editButtonText: { color: navy, fontSize: 10, fontWeight: '700' },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  profileMenuCard: { flexGrow: 1, flexBasis: 220, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EFEE', borderRadius: 15, padding: 18 },
  profileMenuIcon: { color: '#438F83', fontSize: 21, marginBottom: 15 },
  profileMenuTitle: { color: navy, fontSize: 14, fontWeight: '700' },
  profileMenuDetail: { color: muted, fontSize: 10, lineHeight: 17, minHeight: 35, marginTop: 6, marginBottom: 9 },
  demoNote: { borderRadius: 13, backgroundColor: '#F2F6F7', padding: 15, marginTop: 17 },
  demoNoteTitle: { color: navy, fontSize: 11, fontWeight: '700' },
  demoNoteText: { color: muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  adminWelcome: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 30, paddingBottom: 22, flexWrap: 'wrap', gap: 12 },
  adminEyebrow: { color: '#72898F', fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  adminTitle: { color: navy, fontSize: 29, fontWeight: '700', letterSpacing: -0.8 },
  adminSubtitle: { color: muted, fontSize: 12, marginTop: 7 },
  adminDate: { backgroundColor: '#EEF5F4', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  adminDateText: { color: '#557D78', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  metricCard: { flexGrow: 1, flexBasis: 215, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EFEE', borderRadius: 14, padding: 15 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { color: '#7B8E95', fontSize: 8, fontWeight: '800', letterSpacing: 0.9 },
  metricIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  metricIconText: { color: navy, fontSize: 14 },
  metricValue: { color: navy, fontSize: 23, fontWeight: '800', marginTop: 8 },
  metricDelta: { color: '#55927C', fontSize: 9, marginTop: 5 },
  adminTabs: { flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: '#E8EFED', marginTop: 27 },
  adminTab: { paddingBottom: 11, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  adminTabActive: { borderBottomColor: blue },
  adminTabText: { color: '#82939A', fontSize: 11, fontWeight: '600' },
  adminTabTextActive: { color: navy, fontWeight: '800' },
  adminPanel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EFEE', borderRadius: 14, marginTop: 16, paddingHorizontal: 16, paddingBottom: 5 },
  panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EFF2F1' },
  panelTitle: { color: navy, fontSize: 14, fontWeight: '700' },
  panelSub: { color: muted, fontSize: 10, marginTop: 4 },
  panelLink: { color: blue, fontSize: 10, fontWeight: '700' },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F4F3', flexWrap: 'wrap' },
  adminOrderMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EEF6F5', alignItems: 'center', justifyContent: 'center', color: blue },
  adminRowMain: { flex: 1, minWidth: 130 },
  adminRowTitle: { color: navy, fontSize: 10, fontWeight: '700' },
  adminRowSub: { color: muted, fontSize: 9, marginTop: 5 },
  adminRowTotal: { color: navy, fontSize: 11, fontWeight: '800', minWidth: 65 },
  pendingBadge: { backgroundColor: '#FFF4E1', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  pendingBadgeText: { color: '#9B7131', fontSize: 8, fontWeight: '800' },
  dealerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F4F3', flexWrap: 'wrap' },
  dealerInitials: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dealerInitialsText: { color: navy, fontSize: 10, fontWeight: '800' },
  approveButton: { backgroundColor: '#EAF5F0', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  approveButtonText: { color: '#3B8167', fontSize: 9, fontWeight: '700' },
  declineButton: { borderWidth: 1, borderColor: '#E4EBEA', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8 },
  declineButtonText: { color: '#71858D', fontSize: 9, fontWeight: '700' },
  serviceRowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EEF6EF', alignItems: 'center', justifyContent: 'center', color: '#4A9274' },
  adminFootnote: { marginTop: 15, backgroundColor: '#F3F6F6', borderRadius: 9, padding: 11 },
  adminFootnoteText: { color: '#829299', fontSize: 9, textAlign: 'center' },
  bottomNav: { display: 'none', height: 64, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E9EEEF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  bottomNavVisible: { display: 'flex' },
  bottomNavItem: { flex: 1, alignItems: 'center', gap: 4 },
  bottomNavIcon: { color: '#8799A1', fontSize: 17 },
  bottomNavSelected: { color: blue },
  bottomNavLabel: { color: '#82929A', fontSize: 8 },
  bottomNavLabelSelected: { color: blue, fontWeight: '700' },
  toast: { position: 'absolute', bottom: 78, alignSelf: 'center', backgroundColor: navy, borderRadius: 10, paddingHorizontal: 17, paddingVertical: 12, zIndex: 20, shadowColor: navy, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  toastText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  firebaseError: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: '#FFF2F0' },
  firebaseErrorTitle: { color: '#A94442', fontSize: 10, fontWeight: '700' },
  firebaseErrorText: { color: '#845958', fontSize: 9, lineHeight: 15, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(18,42,57,0.36)', justifyContent: 'flex-end' },
  cartSheet: { maxHeight: '90%', minHeight: 280, backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 21, paddingBottom: 20 },
  cartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EDF1F0' },
  cartTitle: { color: navy, fontSize: 20, fontWeight: '700' },
  cartSubtitle: { color: muted, fontSize: 10, marginTop: 4 },
  closeButton: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#F1F5F4', alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: navy, fontSize: 23, lineHeight: 26 },
  cartItemsScroll: { maxHeight: 270 },
  checkoutDetails: { paddingTop: 12, gap: 8 },
  checkoutHeading: { color: navy, fontSize: 11, fontWeight: '700', marginTop: 3 },
  checkoutFields: { flexDirection: 'row', gap: 8 },
  checkoutInput: { minHeight: 38, flex: 1, borderWidth: 1, borderColor: '#E4EAEA', borderRadius: 8, paddingHorizontal: 10, color: navy, fontSize: 10 },
  paymentOptions: { flexDirection: 'row', gap: 8 },
  paymentOption: { borderWidth: 1, borderColor: '#E4EAEA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  paymentOptionSelected: { borderColor: '#75AFA0', backgroundColor: '#EDF7F3' },
  paymentOptionText: { color: '#778990', fontSize: 9, fontWeight: '600' },
  paymentOptionTextSelected: { color: '#337B6C' },
  checkoutError: { color: '#A94442', fontSize: 9 },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F3F2' },
  cartItemThumb: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  cartItemCopy: { flex: 1 },
  cartItemTitle: { color: navy, fontSize: 11, fontWeight: '700' },
  cartItemType: { color: muted, fontSize: 8, marginTop: 4 },
  cartItemPrice: { color: navy, fontSize: 11, fontWeight: '800', marginTop: 5 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityButton: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#F2F6F5', alignItems: 'center', justifyContent: 'center' },
  quantityText: { color: navy, fontSize: 11, fontWeight: '700', minWidth: 12, textAlign: 'center' },
  cartSummary: { paddingTop: 13 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  summaryLabel: { color: muted, fontSize: 11 },
  summaryValue: { color: navy, fontSize: 11, fontWeight: '600' },
  freeDelivery: { color: '#4A9274', fontSize: 10, fontWeight: '800' },
  totalLine: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDF1F0', marginTop: 2 },
  totalLabel: { color: navy, fontSize: 13, fontWeight: '700' },
  totalValue: { color: navy, fontSize: 15, fontWeight: '800' },
  checkoutNote: { color: '#85959B', fontSize: 9, textAlign: 'center', marginTop: 9 },
  emptyCart: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 18, paddingBottom: 10 },
  emptyCartIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#EEF6F4', alignItems: 'center', justifyContent: 'center', color: blue, fontSize: 24 },
});

export default App;
