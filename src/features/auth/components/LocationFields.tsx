import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import {
  Camera as MapCamera,
  Map as MapLibreMap,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import {
  getBarangays,
  getCitiesMunicipalities,
  getProvinces,
  LocationOption,
  resolvePhilippineLocation,
} from '../services/philippineLocations';
import { MAPS_ENABLED } from '../../maps/config';

// ─── World countries (ISO 3166-1 alpha-2) ─────────────────────────────────────
// Full list — sorted alphabetically. Philippines is listed normally (not special-cased).
const WORLD_COUNTRIES: LocationOption[] = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KP', name: 'North Korea' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LocationValue {
  countryCode: string;       // ISO 3166-1 alpha-2 (e.g. 'PH', 'US')
  country: string;           // Full country name (e.g. 'Philippines')
  province: LocationOption | null;    // PH only
  city: LocationOption | null;        // PH only
  barangay: LocationOption | null;    // PH only
  stateRegion: string;       // non-PH: state / region / province (free text)
  cityText: string;          // non-PH: city / municipality (free text)
  addressLine: string;       // street / house / unit
}

interface Props {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  error?: string;
  onMapVisibilityChange?: (visible: boolean) => void;
}

type Coordinates = { latitude: number; longitude: number };

function LocationMapModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (coordinates: Coordinates) => Promise<void>;
}) {
  const camera = useRef<CameraRef>(null);
  const [coordinates, setCoordinates] = useState<Coordinates>({
    latitude: 14.5995,
    longitude: 120.9842,
  });
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const locateCurrentPosition = async () => {
    setLocating(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Allow location access to find your current position.');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoordinates(next);
      camera.current?.flyTo({
        center: [next.longitude, next.latitude],
        zoom: 15,
        duration: 700,
      });
    } catch (locationError) {
      setError(
        locationError instanceof Error
          ? locationError.message
          : 'Could not find your current position. Try moving the map instead.',
      );
    } finally {
      setLocating(false);
    }
  };

  const confirmPosition = async () => {
    setSaving(true);
    setError('');
    try {
      await onSelect(coordinates);
      onClose();
    } catch (selectionError) {
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : 'Could not identify this location. Move the map and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.mapModal}>
        <View style={styles.mapHeader}>
          <View style={styles.mapHeaderCopy}>
            <Text style={styles.modalEyebrow}>PICK YOUR LOCATION</Text>
            <Text style={styles.modalTitle}>Move the map pin</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close map"
          >
            <Icon name="close" size={22} color="#191611" />
          </TouchableOpacity>
        </View>

        <View style={styles.mapWrap}>
          <MapLibreMap
            style={StyleSheet.absoluteFill}
            mapStyle="https://tiles.openfreemap.org/styles/liberty"
            attribution={false}
            logo={false}
            onRegionDidChange={event => {
              const [longitude, latitude] = event.nativeEvent.center;
              setCoordinates({ latitude, longitude });
            }}
          >
            <MapCamera
              ref={camera}
              initialViewState={{
                center: [coordinates.longitude, coordinates.latitude],
                zoom: 12,
              }}
            />
          </MapLibreMap>
          <View pointerEvents="none" style={styles.centerPin}>
            <Icon name="location" size={42} color="#B63B32" />
          </View>
          <TouchableOpacity
            style={styles.locateButton}
            onPress={locateCurrentPosition}
            disabled={locating}
            accessibilityRole="button"
          >
            {locating ? (
              <ActivityIndicator size="small" color="#191611" />
            ) : (
              <Icon name="locate" size={18} color="#191611" />
            )}
            <Text style={styles.locateButtonText}>
              {locating ? 'Locating…' : 'Use my location'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapFooter}>
          <Text style={styles.mapHint}>
            Drag the map until the pin is over your home. We’ll fill in the nearby address.
          </Text>
          {error ? (
            <View style={styles.mapError}>
              <Icon name="alert-circle-outline" size={15} color="#B63B32" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.mapConfirmButton, saving && styles.mapConfirmDisabled]}
            onPress={confirmPosition}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="checkmark" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.mapConfirmText}>
              {saving ? 'Finding address…' : 'Use this location'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Country picker modal ─────────────────────────────────────────────────────
function CountryPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (c: LocationOption) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? WORLD_COUNTRIES.filter(c => c.name.toLowerCase().includes(q)) : WORLD_COUNTRIES;
  }, [search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalEyebrow}>SELECT LOCATION</Text>
            <Text style={styles.modalTitle}>Country</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="close" size={22} color="#191611" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color="#A59C90" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search country…"
            placeholderTextColor="#A59C90"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="words"
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => item.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          initialNumToRender={30}
          ListEmptyComponent={<Text style={styles.empty}>No country found.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.option}
              onPress={() => { onSelect(item); setSearch(''); onClose(); }}
            >
              <Text style={styles.optionText}>{item.name}</Text>
              {item.code === selected && <Icon name="checkmark-circle" size={21} color="#B99345" />}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── PH sub-location picker modal ────────────────────────────────────────────
function SelectField({
  label, placeholder, value, options, onSelect, disabled = false, loading = false,
}: {
  label: string; placeholder: string; value: string;
  options: LocationOption[]; onSelect: (o: LocationOption) => void;
  disabled?: boolean; loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter(o => o.name.toLowerCase().includes(q)) : options;
  }, [options, search]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.select, disabled && styles.disabled]}
        onPress={() => !disabled && !loading && setOpen(true)}
        disabled={disabled || loading}
        accessibilityRole="button"
      >
        <Icon name="location-outline" size={17} color={value ? '#B99345' : '#A59C90'} />
        <Text style={[styles.selectText, !value && styles.placeholder]} numberOfLines={1}>
          {loading ? 'Loading…' : value || placeholder}
        </Text>
        {loading ? <ActivityIndicator size="small" color="#B99345" /> : <Icon name="chevron-down" size={17} color="#6E665B" />}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>SELECT LOCATION</Text>
              <Text style={styles.modalTitle}>{label}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setOpen(false)} accessibilityRole="button">
              <Icon name="close" size={22} color="#191611" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color="#A59C90" />
            <TextInput
              value={search} onChangeText={setSearch}
              placeholder={`Search ${label.toLowerCase()}`}
              placeholderTextColor="#A59C90" style={styles.searchInput}
              autoCorrect={false} autoCapitalize="words"
            />
          </View>
          <FlatList
            data={filtered} keyExtractor={item => item.code}
            keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.empty}>No matching location found.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.option} onPress={() => { onSelect(item); setSearch(''); setOpen(false); }}>
                <Text style={styles.optionText}>{item.name}</Text>
                {item.name === value && <Icon name="checkmark-circle" size={21} color="#B99345" />}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Main LocationFields component ───────────────────────────────────────────
export function LocationFields({ value, onChange, error, onMapVisibilityChange }: Props) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [provinces, setProvinces]     = useState<LocationOption[]>([]);
  const [cities, setCities]           = useState<LocationOption[]>([]);
  const [barangays, setBarangays]     = useState<LocationOption[]>([]);
  const [loading, setLoading]         = useState({ provinces: false, cities: false, barangays: false });
  const [loadError, setLoadError]     = useState('');
  const [retry, setRetry]             = useState(0);

  const isPH = value.countryCode === 'PH';

  useEffect(() => {
    if (!isPH) return;
    let active = true;
    setLoading(p => ({ ...p, provinces: true }));
    setLoadError('');
    getProvinces()
      .then(items => active && setProvinces(items))
      .catch(() => active && setLoadError('Could not load Philippine locations. Check your connection.'))
      .finally(() => active && setLoading(p => ({ ...p, provinces: false })));
    return () => { active = false; };
  }, [isPH, retry]);

  useEffect(() => {
    if (!value.province) {
      setCities([]);
      setBarangays([]);
      return;
    }
    let active = true;
    setCities([]);
    setLoading(p => ({ ...p, cities: true }));
    setLoadError('');
    getCitiesMunicipalities(value.province.code)
      .then(items => active && setCities(items))
      .catch(() => active && setLoadError('Could not load cities.'))
      .finally(() => active && setLoading(p => ({ ...p, cities: false })));
    return () => { active = false; };
  }, [value.province, retry]);

  useEffect(() => {
    if (!value.city) {
      setBarangays([]);
      return;
    }
    let active = true;
    setBarangays([]);
    setLoading(p => ({ ...p, barangays: true }));
    setLoadError('');
    getBarangays(value.city.code)
      .then(items => active && setBarangays(items))
      .catch(() => active && setLoadError('Could not load barangays.'))
      .finally(() => active && setLoading(p => ({ ...p, barangays: false })));
    return () => { active = false; };
  }, [value.city, retry]);

  const update = (patch: Partial<LocationValue>) => onChange({ ...value, ...patch });
  const openMap = () => {
    if (!MAPS_ENABLED) return;

    setMapOpen(true);
    onMapVisibilityChange?.(true);
  };
  const closeMap = () => {
    setMapOpen(false);
    onMapVisibilityChange?.(false);
  };

  const selectedCountryName = value.country || 'Select country';
  const selectedLocation = [
    value.addressLine,
    value.barangay?.name,
    value.city?.name || value.cityText,
    value.province?.name || value.stateRegion,
  ].filter(Boolean).join(', ');

  const applyMapLocation = async ({ latitude, longitude }: Coordinates) => {
    let [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place?.country) {
      throw new Error('No address details were found here. Move the map and try again.');
    }

    const countryCode = place.isoCountryCode?.toUpperCase()
      ?? WORLD_COUNTRIES.find(item => item.name.toLowerCase() === place.country?.toLowerCase())?.code
      ?? '';
    const country = WORLD_COUNTRIES.find(item => item.code === countryCode)?.name
      ?? place.country;
    const isPhilippines = countryCode === 'PH';
    const street = [place.streetNumber, place.street].filter(Boolean).join(' ');
    const addressLine = street || place.name || '';
    const philippineLocation = isPhilippines
      ? await resolvePhilippineLocation(
          [place.subregion, place.region, place.district, place.city].filter(
            (name): name is string => Boolean(name),
          ),
          [place.city, place.district, place.subregion, place.name].filter(
            (name): name is string => Boolean(name),
          ),
        )
      : null;

    if (isPhilippines && !philippineLocation) {
      throw new Error(
        'Could not match this location to a Philippine city or municipality. Move the map pin or select your location manually.',
      );
    }

    onChange({
      countryCode,
      country,
      province: philippineLocation?.province ?? null,
      city: philippineLocation?.city ?? null,
      barangay: null,
      stateRegion: isPhilippines ? '' : place.subregion || place.region || '',
      cityText: isPhilippines ? '' : place.city || place.district || '',
      addressLine,
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}><Icon name="navigate" size={16} color="#B99345" /></View>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>Your home location</Text>
          <Text style={styles.sectionDescription}>Used to personalise nearby heritage content.</Text>
        </View>
      </View>

      <View style={[styles.mapShortcut, !MAPS_ENABLED && styles.mapShortcutDisabled]}>
        <View style={styles.mapShortcutCopy}>
          <Text style={styles.mapShortcutTitle}>
            {MAPS_ENABLED ? 'FIND YOUR ADDRESS' : 'MAP DISABLED FOR TESTING'}
          </Text>
          <Text style={styles.mapShortcutSummary} numberOfLines={2}>
            {selectedLocation || (MAPS_ENABLED ? 'Choose a spot on the map to fill this in' : 'Select your location manually below.')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.mapShortcutButton, !MAPS_ENABLED && styles.mapShortcutButtonDisabled]}
          onPress={openMap}
          disabled={!MAPS_ENABLED}
          accessibilityRole="button"
          accessibilityLabel={MAPS_ENABLED ? 'Choose location on map' : 'Map disabled for testing'}
          accessibilityState={{ disabled: !MAPS_ENABLED }}
        >
          <Icon name="map-outline" size={17} color="#FFFFFF" />
          <Text style={styles.mapShortcutButtonText}>{MAPS_ENABLED ? 'Map' : 'Off'}</Text>
        </TouchableOpacity>
      </View>

      <LocationMapModal
        visible={MAPS_ENABLED && mapOpen}
        onClose={closeMap}
        onSelect={applyMapLocation}
      />

      {/* Country selector */}
      <View style={styles.field}>
        <Text style={styles.label}>COUNTRY</Text>
        <TouchableOpacity
          style={styles.select}
          onPress={() => setCountryOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Country. ${selectedCountryName}`}
        >
          <Icon name="globe-outline" size={17} color={value.countryCode ? '#B99345' : '#A59C90'} />
          <Text style={[styles.selectText, !value.countryCode && styles.placeholder]} numberOfLines={1}>
            {selectedCountryName}
          </Text>
          <Icon name="chevron-down" size={17} color="#6E665B" />
        </TouchableOpacity>
      </View>

      <CountryPickerModal
        visible={countryOpen}
        selected={value.countryCode}
        onSelect={c => {
          onChange({
            countryCode: c.code,
            country: c.name,
            province: null,
            city: null,
            barangay: null,
            stateRegion: '',
            cityText: '',
            addressLine: '',
          });
        }}
        onClose={() => setCountryOpen(false)}
      />

      {/* Philippines — full province → city → barangay drill */}
      {isPH && (
        <>
          <SelectField
            label="PROVINCE / AREA" placeholder="Select province"
            value={value.province?.name ?? ''} options={provinces}
            loading={loading.provinces}
            onSelect={province => update({ province, city: null, barangay: null })}
          />
          <SelectField
            label="CITY / MUNICIPALITY" placeholder="Select city or municipality"
            value={value.city?.name ?? ''} options={cities}
            disabled={!value.province} loading={loading.cities}
            onSelect={city => update({ city, barangay: null })}
          />
          <SelectField
            label="BARANGAY" placeholder="Select barangay"
            value={value.barangay?.name ?? ''} options={barangays}
            disabled={!value.city} loading={loading.barangays}
            onSelect={barangay => update({ barangay })}
          />
          <View style={styles.field}>
            <Text style={styles.label}>HOUSE / STREET / PUROK (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput} value={value.addressLine}
              onChangeText={addressLine => update({ addressLine })}
              placeholder="e.g. Purok 2, Rizal Street"
              placeholderTextColor="#A59C90" autoCapitalize="words"
            />
          </View>
        </>
      )}

      {/* Other countries — state/region + city + address */}
      {value.countryCode && !isPH && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>STATE / REGION / PROVINCE</Text>
            <TextInput
              style={styles.textInput} value={value.stateRegion}
              onChangeText={stateRegion => update({ stateRegion })}
              placeholder="e.g. California, Ontario, Bavaria"
              placeholderTextColor="#A59C90" autoCapitalize="words"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>CITY / MUNICIPALITY</Text>
            <TextInput
              style={styles.textInput} value={value.cityText}
              onChangeText={cityText => update({ cityText })}
              placeholder="e.g. Los Angeles, Toronto"
              placeholderTextColor="#A59C90" autoCapitalize="words"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>STREET ADDRESS (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, styles.multiline]} value={value.addressLine}
              onChangeText={addressLine => update({ addressLine })}
              placeholder="Street, building, unit, postal code"
              placeholderTextColor="#A59C90" autoCapitalize="words" multiline
            />
          </View>
        </>
      )}

      {loadError ? (
        <TouchableOpacity style={styles.message} onPress={() => setRetry(v => v + 1)}>
          <Icon name="cloud-offline-outline" size={15} color="#B63B32" />
          <Text style={styles.errorText}>{loadError} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}
      {error ? (
        <View style={styles.message}>
          <Icon name="alert-circle-outline" size={15} color="#B63B32" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section:            { padding: 13, borderRadius: 14, borderWidth: 1, borderColor: '#E5DED2', backgroundColor: '#FCFAF6', marginBottom: 14 },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  sectionIcon:        { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F5ECD9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sectionCopy:        { flex: 1 },
  sectionTitle:       { color: '#191611', fontSize: 13, fontWeight: '800' },
  sectionDescription: { color: '#6E665B', fontSize: 10, lineHeight: 15, marginTop: 2 },
  mapShortcut:        { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, marginBottom: 13, borderRadius: 12, borderWidth: 1, borderColor: '#E8D9B8', backgroundColor: '#F8F1E3' },
  mapShortcutDisabled: { opacity: 0.65 },
  mapShortcutCopy:    { flex: 1 },
  mapShortcutTitle:   { color: '#6E665B', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  mapShortcutSummary: { color: '#302A22', fontSize: 12, lineHeight: 16, marginTop: 4 },
  mapShortcutButton:  { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 13, borderRadius: 10, backgroundColor: '#B99345' },
  mapShortcutButtonDisabled: { backgroundColor: '#8B8479' },
  mapShortcutButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  field:              { marginBottom: 10 },
  label:              { color: '#6E665B', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 6 },
  select:             { minHeight: 47, borderWidth: 1.3, borderColor: '#E5DED2', borderRadius: 10, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  disabled:           { opacity: 0.5, backgroundColor: '#F3EFE8' },
  selectText:         { flex: 1, color: '#191611', fontSize: 13.5 },
  placeholder:        { color: '#A59C90' },
  textInput:          { minHeight: 47, borderWidth: 1.3, borderColor: '#E5DED2', borderRadius: 10, backgroundColor: '#FFF', color: '#191611', fontSize: 13.5, paddingHorizontal: 13, paddingVertical: 11 },
  multiline:          { minHeight: 76, textAlignVertical: 'top' },
  message:            { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  errorText:          { flex: 1, color: '#B63B32', fontSize: 10.5, lineHeight: 15 },
  // Picker modal
  modalScreen:   { flex: 1, backgroundColor: '#F7F4EF' },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  modalEyebrow:  { color: '#B99345', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  modalTitle:    { color: '#191611', fontSize: 24, fontWeight: '800', marginTop: 3 },
  closeButton:   { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  searchBox:     { marginHorizontal: 20, marginBottom: 12, minHeight: 48, borderRadius: 13, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5DED2', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  searchInput:   { flex: 1, color: '#191611', fontSize: 15, paddingVertical: 12 },
  listContent:   { paddingHorizontal: 20, paddingBottom: 30 },
  option:        { minHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5DED2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionText:    { flex: 1, color: '#302A22', fontSize: 15, fontWeight: '600' },
  empty:         { color: '#6E665B', textAlign: 'center', marginTop: 40 },
  mapModal:      { flex: 1, backgroundColor: '#F7F4EF' },
  mapHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13 },
  mapHeaderCopy: { flex: 1 },
  mapWrap:       { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#E9E6DF' },
  centerPin:     { position: 'absolute', left: '50%', top: '50%', marginLeft: -21, marginTop: -42, shadowColor: '#000', shadowOpacity: 0.22, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 5 },
  locateButton:  { position: 'absolute', right: 14, bottom: 16, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, borderRadius: 22, backgroundColor: '#FFFFFF', elevation: 3 },
  locateButtonText: { color: '#191611', fontSize: 12, fontWeight: '700' },
  mapFooter:     { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  mapHint:       { color: '#6E665B', fontSize: 12, lineHeight: 17 },
  mapError:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  mapConfirmButton: { minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 13, borderRadius: 12, backgroundColor: '#B99345' },
  mapConfirmDisabled: { opacity: 0.65 },
  mapConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
