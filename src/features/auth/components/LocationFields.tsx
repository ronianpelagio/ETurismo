import React, { useEffect, useMemo, useState } from 'react';
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
  getBarangays,
  getCitiesMunicipalities,
  getProvinces,
  LocationOption,
} from '../services/philippineLocations';
import { COUNTRIES, Country } from '../services/countries';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface LocationValue {
  /** ISO alpha-2 code of the selected country, or '' if nothing chosen yet. */
  countryCode: string;
  /** Display name of the selected country. */
  country: string;
  /** PH-only: selected province */
  province: LocationOption | null;
  /** PH-only: selected city / municipality */
  city: LocationOption | null;
  /** PH-only: selected barangay */
  barangay: LocationOption | null;
  /** PH-only: house / street / purok */
  addressLine: string;
  /** Non-PH: state, region, or province (free text) */
  stateRegion: string;
  /** Non-PH: city (free text) */
  cityText: string;
  /** Non-PH: additional address */
  addressText: string;
}

/** Backwards-compatible alias — old code used countryMode */
export type { LocationValue as LocationFields };

interface Props {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  error?: string;
}

// ─── Country options — convert to LocationOption shape so SelectField works ──

const COUNTRY_OPTIONS: LocationOption[] = COUNTRIES.map(c => ({
  code: c.code,
  name: c.name,
}));

// ─── Generic searchable picker ────────────────────────────────────────────────

function SelectField({
  label,
  placeholder,
  value,
  options,
  onSelect,
  disabled = false,
  loading = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: LocationOption[];
  onSelect: (option: LocationOption) => void;
  disabled?: boolean;
  loading?: boolean;
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
        accessibilityLabel={`${label}. ${value || placeholder}`}
      >
        <Icon name="location-outline" size={17} color={value ? '#B99345' : '#A59C90'} />
        <Text style={[styles.selectText, !value && styles.placeholder]} numberOfLines={1}>
          {loading ? 'Loading…' : value || placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#B99345" />
        ) : (
          <Icon name="chevron-down" size={17} color="#6E665B" />
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>SELECT LOCATION</Text>
              <Text style={styles.modalTitle}>{label}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => { setOpen(false); setSearch(''); }}
              accessibilityRole="button"
              accessibilityLabel="Close picker"
            >
              <Icon name="close" size={22} color="#191611" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Icon name="search" size={18} color="#A59C90" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${label.toLowerCase()}…`}
              placeholderTextColor="#A59C90"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="words"
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={17} color="#A59C90" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>No matching location found.</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => {
                  onSelect(item);
                  setSearch('');
                  setOpen(false);
                }}
                android_ripple={{ color: '#F5ECD9' }}
              >
                <Text style={styles.optionText}>{item.name}</Text>
                {item.name === value && (
                  <Icon name="checkmark-circle" size={21} color="#B99345" />
                )}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Main LocationFields component ───────────────────────────────────────────

export function LocationFields({ value, onChange, error }: Props) {
  // PH sub-location data
  const [provinces,  setProvinces]  = useState<LocationOption[]>([]);
  const [cities,     setCities]     = useState<LocationOption[]>([]);
  const [barangays,  setBarangays]  = useState<LocationOption[]>([]);
  const [loading,    setLoading]    = useState({ provinces: false, cities: false, barangays: false });
  const [loadError,  setLoadError]  = useState('');
  const [retry,      setRetry]      = useState(0);

  const isPhilippines = value.countryCode === 'PH';

  // Load PH provinces when Philippines is selected
  useEffect(() => {
    if (!isPhilippines) return;
    let active = true;
    setLoading(p => ({ ...p, provinces: true }));
    setLoadError('');
    getProvinces()
      .then(items => active && setProvinces(items))
      .catch(() => active && setLoadError('Could not load Philippine locations. Check your connection.'))
      .finally(() => active && setLoading(p => ({ ...p, provinces: false })));
    return () => { active = false; };
  }, [isPhilippines, retry]);

  // Load cities when province changes
  useEffect(() => {
    if (!value.province) return;
    let active = true;
    setCities([]);
    setLoading(p => ({ ...p, cities: true }));
    setLoadError('');
    getCitiesMunicipalities(value.province.code)
      .then(items => active && setCities(items))
      .catch(() => active && setLoadError('Could not load cities and municipalities.'))
      .finally(() => active && setLoading(p => ({ ...p, cities: false })));
    return () => { active = false; };
  }, [value.province, retry]);

  // Load barangays when city changes
  useEffect(() => {
    if (!value.city) return;
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

  /** Called when user picks a country from the picker. */
  const handleCountrySelect = (option: LocationOption) => {
    onChange({
      countryCode:  option.code,
      country:      option.name,
      // Reset all sub-location fields
      province:     null,
      city:         null,
      barangay:     null,
      addressLine:  '',
      stateRegion:  '',
      cityText:     '',
      addressText:  '',
    });
  };

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon name="navigate" size={16} color="#B99345" />
        </View>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>Your home location</Text>
          <Text style={styles.sectionDescription}>
            Choose your country, then fill in your address details.
          </Text>
        </View>
      </View>

      {/* ── Country picker (all 195 countries) ── */}
      <SelectField
        label="COUNTRY"
        placeholder="Select your country"
        value={value.country}
        options={COUNTRY_OPTIONS}
        onSelect={handleCountrySelect}
      />

      {/* ── Philippines: province → city → barangay → address ── */}
      {isPhilippines && (
        <>
          <SelectField
            label="PROVINCE / AREA"
            placeholder="Select province"
            value={value.province?.name ?? ''}
            options={provinces}
            loading={loading.provinces}
            onSelect={province => update({ province, city: null, barangay: null })}
          />
          <SelectField
            label="CITY / MUNICIPALITY"
            placeholder="Select city or municipality"
            value={value.city?.name ?? ''}
            options={cities}
            disabled={!value.province}
            loading={loading.cities}
            onSelect={city => update({ city, barangay: null })}
          />
          <SelectField
            label="BARANGAY"
            placeholder="Select barangay"
            value={value.barangay?.name ?? ''}
            options={barangays}
            disabled={!value.city}
            loading={loading.barangays}
            onSelect={barangay => update({ barangay })}
          />
          <View style={styles.field}>
            <Text style={styles.label}>HOUSE / STREET / PUROK (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput}
              value={value.addressLine}
              onChangeText={addressLine => update({ addressLine })}
              placeholder="e.g. Purok 2, Rizal Street"
              placeholderTextColor="#A59C90"
              autoCapitalize="words"
            />
          </View>
        </>
      )}

      {/* ── All other countries: state/region → city → address ── */}
      {value.countryCode !== '' && !isPhilippines && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>STATE / REGION / PROVINCE</Text>
            <TextInput
              style={styles.textInput}
              value={value.stateRegion}
              onChangeText={stateRegion => update({ stateRegion })}
              placeholder="e.g. California, Ontario, Bavaria"
              placeholderTextColor="#A59C90"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>CITY / TOWN</Text>
            <TextInput
              style={styles.textInput}
              value={value.cityText}
              onChangeText={cityText => update({ cityText })}
              placeholder="e.g. Los Angeles, Toronto"
              placeholderTextColor="#A59C90"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>STREET / POSTAL CODE (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, styles.multiline]}
              value={value.addressText}
              onChangeText={addressText => update({ addressText })}
              placeholder="Street address and / or postal code"
              placeholderTextColor="#A59C90"
              autoCapitalize="words"
              multiline
            />
          </View>
        </>
      )}

      {/* Error / retry */}
      {loadError ? (
        <TouchableOpacity style={styles.message} onPress={() => setRetry(r => r + 1)}>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5DED2',
    backgroundColor: '#FCFAF6',
    marginBottom: 14,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  sectionIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F5ECD9',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: '#191611', fontSize: 13, fontWeight: '800' },
  sectionDescription: { color: '#6E665B', fontSize: 10, lineHeight: 15, marginTop: 2 },

  field: { marginBottom: 10 },
  label: { color: '#6E665B', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 6 },

  select: {
    minHeight: 47,
    borderWidth: 1.3, borderColor: '#E5DED2',
    borderRadius: 10, backgroundColor: '#FFF',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, gap: 9,
  },
  disabled: { opacity: 0.5, backgroundColor: '#F3EFE8' },
  selectText: { flex: 1, color: '#191611', fontSize: 13.5 },
  placeholder: { color: '#A59C90' },

  textInput: {
    minHeight: 47,
    borderWidth: 1.3, borderColor: '#E5DED2',
    borderRadius: 10, backgroundColor: '#FFF',
    color: '#191611', fontSize: 13.5,
    paddingHorizontal: 13, paddingVertical: 11,
  },
  multiline: { minHeight: 76, textAlignVertical: 'top' },

  message: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  errorText: { flex: 1, color: '#B63B32', fontSize: 10.5, lineHeight: 15 },

  // Modal
  modalScreen: { flex: 1, backgroundColor: '#F7F4EF' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  modalEyebrow: { color: '#B99345', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  modalTitle: { color: '#191611', fontSize: 24, fontWeight: '800', marginTop: 3 },
  closeButton: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },
  searchBox: {
    marginHorizontal: 20, marginBottom: 12,
    minHeight: 48, borderRadius: 13,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5DED2',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 10,
  },
  searchInput: { flex: 1, color: '#191611', fontSize: 15, paddingVertical: 12 },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  option: {
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5DED2',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  optionText: { flex: 1, color: '#302A22', fontSize: 15, fontWeight: '600' },
  empty: { color: '#6E665B', textAlign: 'center', marginTop: 40 },
});
