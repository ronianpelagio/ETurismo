import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { supabase } from '../../services/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { STORAGE_KEYS, getStringArray, toggleInStringArray } from '../../utils/storage';

const { width: W } = Dimensions.get('window');
const GAP = 12;
const CARD_W = (W - 40 - GAP) / 2;
const GOLD = '#B99345';
const INK = '#191611';
const CREAM = '#F7F4EE';

type Artifact = { id:string; name:string; category:string; qr_code?:string; qr_value?:string; created_at?:string; description?:string; image_url?:string; creator?:string; date?:string };
type Translation = { language_code:string; name?:string; description?:string|null; audio_url?:string|null };

const CATEGORIES = ['Sacred Vessels','Liturgical Books','Vestments','Altar Furnishings','Devotional Objects','Sacramentals','Musical Instruments','Architectural and Decorative Elements'];
const FALLBACK = 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=900';
const LANG:Record<string,string> = { en:'English', fil:'Filipino', ja:'Japanese', es:'Spanish', ko:'Korean' };

function DetailModal({ artifact, favorite, onToggleFavorite, onClose }:{ artifact:Artifact|null; favorite:boolean; onToggleFavorite:()=>void; onClose:()=>void }) {
  const [translations,setTranslations]=useState<Translation[]>([]);
  const [language,setLanguage]=useState('en');
  const [loading,setLoading]=useState(false);
  const [playing,setPlaying]=useState(false);
  const player=useRef<any>(null);

  useEffect(()=>{ if(!artifact) return; setLanguage('en'); setTranslations([]); setLoading(true); (async()=>{
    try { await setAudioModeAsync({allowsRecording:false,playsInSilentMode:true,shouldPlayInBackground:false,interruptionMode:'duckOthers'}); const {data}=await supabase.from('artifact_translations').select('language_code,name,description,audio_url').eq('artifact_id',artifact.id); setTranslations(data||[]); const first=(data||[]).find((x:any)=>x.language_code==='en') || data?.[0]; if(first) setLanguage(first.language_code); } finally { setLoading(false); }
  })(); return()=>{ try{player.current?.pause?.();player.current?.remove?.();}catch{} player.current=null; }; },[artifact]);

  if(!artifact) return null;
  const tr=translations.find(t=>t.language_code===language);
  const description=tr?.description || artifact.description || 'No description available.';
  const audio=tr?.audio_url || null;
  const available=translations.filter(t=>t.description||t.audio_url);
  const stop=()=>{ try{player.current?.pause?.();player.current?.remove?.();}catch{} player.current=null; setPlaying(false); };
  const toggleAudio=()=>{ if(playing){stop();return;} if(!audio)return; stop(); const p=createAudioPlayer({uri:audio}) as any; player.current=p; setPlaying(true); p.addListener?.('playbackStatusUpdate',(s:any)=>{if(s.didJustFinish)stop();}); p.play(); };

  return <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={d.root} edges={['top','bottom']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.scroll}>
        <View style={d.hero}>
          <Image source={{uri:artifact.image_url||FALLBACK}} style={d.heroImage} resizeMode="cover" />
          <View style={d.scrim}/>
          <TouchableOpacity style={[d.roundBtn,{left:16}]} onPress={onClose}><Ionicons name="chevron-back" size={22} color="#fff"/></TouchableOpacity>
          <TouchableOpacity style={[d.roundBtn,{right:16}]} onPress={onToggleFavorite}><Ionicons name={favorite?'heart':'heart-outline'} size={22} color={favorite?'#F4C95D':'#fff'}/></TouchableOpacity>
          <View style={d.category}><Text style={d.categoryText}>{artifact.category}</Text></View>
        </View>
        <View style={d.content}>
          <Text style={d.name}>{tr?.name || artifact.name}</Text>
          <Text style={d.place}>National Shrine of Our Lady of Sorrows</Text>
          {available.length>1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={d.langRow}>{available.map(x=><TouchableOpacity key={x.language_code} onPress={()=>{stop();setLanguage(x.language_code)}} style={[d.langChip,language===x.language_code&&d.langChipOn]}><Text style={[d.langText,language===x.language_code&&d.langTextOn]}>{LANG[x.language_code]||x.language_code.toUpperCase()}</Text></TouchableOpacity>)}</ScrollView>}
          <Text style={d.section}>OVERVIEW</Text>
          <Text style={d.desc}>{loading?'Loading…':description}</Text>
          <View style={d.metaCard}>
            <View style={d.metaItem}><Ionicons name="calendar-outline" size={18} color={GOLD}/><View><Text style={d.metaLabel}>Date / Period</Text><Text style={d.metaValue}>{artifact.date||'Date unknown'}</Text></View></View>
            <View style={d.metaDivider}/>
            <View style={d.metaItem}><Ionicons name="person-outline" size={18} color={GOLD}/><View><Text style={d.metaLabel}>Creator / Artist</Text><Text style={d.metaValue}>{artifact.creator||'Unknown'}</Text></View></View>
            <View style={d.metaDivider}/>
            <View style={d.metaItem}><Ionicons name="albums-outline" size={18} color={GOLD}/><View><Text style={d.metaLabel}>Category</Text><Text style={d.metaValue}>{artifact.category}</Text></View></View>
          </View>
          {audio && <View style={d.audioCard}><TouchableOpacity style={d.play} onPress={toggleAudio}><Ionicons name={playing?'pause':'play'} size={22} color="#fff"/></TouchableOpacity><View style={{flex:1}}><Text style={d.audioTitle}>Audio Guide</Text><Text style={d.audioSub}>{LANG[language]||language} narration</Text></View><Ionicons name="headset-outline" size={24} color={GOLD}/></View>}
          <TouchableOpacity style={d.done} onPress={onClose}><Text style={d.doneText}>Back to Collection</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

function Card({item,scanned,favorite,onPress,onFavorite}:{item:Artifact;scanned:boolean;favorite:boolean;onPress:()=>void;onFavorite:()=>void}){
 return <TouchableOpacity style={[c.card,!scanned&&c.locked]} onPress={scanned?onPress:undefined} activeOpacity={scanned ? 0.82 : 1}>
  <View style={c.imageWrap}><Image source={{uri:item.image_url||FALLBACK}} style={[c.image,!scanned&&{opacity:.35}]}/>{!scanned&&<View style={c.lock}><Ionicons name="lock-closed" size={20} color="#fff"/></View>}{scanned&&<TouchableOpacity style={c.heart} onPress={onFavorite}><Ionicons name={favorite?'heart':'heart-outline'} size={18} color={favorite?'#E25A5A':'#fff'}/></TouchableOpacity>}</View>
  <View style={c.info}><Text style={c.category} numberOfLines={1}>{item.category}</Text><Text style={c.title} numberOfLines={2}>{item.name}</Text><View style={c.footer}><Text style={c.status}>{scanned?'Discovered':'Scan to unlock'}</Text>{scanned&&<Ionicons name="arrow-forward" size={14} color={GOLD}/>}</View></View>
 </TouchableOpacity>
}

export default function CollectionPage({onBack}:{onBack:()=>void}){
 const {theme}=useAppTheme();
 const [items,setItems]=useState<Artifact[]>([]),[scanned,setScanned]=useState<string[]>([]),[favorites,setFavorites]=useState<string[]>([]);
 const [category,setCategory]=useState<string|null>(null),[selected,setSelected]=useState<Artifact|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const {data,error:e}=await supabase.from('artifacts').select('id,name,category,qr_code,qr_value,created_at,description,image_url,creator,date').order('name');if(e)throw e;setItems(data||[]);const raw=await AsyncStorage.getItem('scannedArtifacts');if(raw){try{const parsed=JSON.parse(raw);setScanned(parsed.map((x:any)=>typeof x==='string'?x:x.id).filter(Boolean));}catch{setScanned([])}}setFavorites(await getStringArray(STORAGE_KEYS.favoriteArtifacts));}catch(e:any){setError(e?.message||'Could not load collection.')}finally{setLoading(false)}},[]);
 useEffect(()=>{load()},[load]);
 const shown=useMemo(()=>category?items.filter(x=>x.category===category):items,[items,category]);
 const discovered=new Set(scanned);
 const discoveredCount=items.filter(x=>discovered.has(x.id)).length;
 const toggleFavorite=async(id:string)=>setFavorites(await toggleInStringArray(STORAGE_KEYS.favoriteArtifacts,id));
 if(loading)return <SafeAreaView style={[s.root,{backgroundColor:theme.bg}]}><View style={s.center}><ActivityIndicator size="large" color={GOLD}/><Text style={s.muted}>Loading your collection…</Text></View></SafeAreaView>;
 return <SafeAreaView style={[s.root,{backgroundColor:theme.bg}]} edges={['top']}><StatusBar style="dark"/>
  <View style={s.header}><TouchableOpacity style={s.back} onPress={onBack}><Ionicons name="chevron-back" size={23} color={INK}/></TouchableOpacity><View style={{flex:1}}><Text style={s.eyebrow}>YOUR JOURNEY</Text><Text style={s.heading}>Collection</Text></View><View style={s.counter}><Text style={s.counterBig}>{discoveredCount}</Text><Text style={s.counterSmall}>/{items.length}</Text></View></View>
  <View style={s.summary}><View style={{flex:1}}><Text style={s.summaryTitle}>Sacred discoveries</Text><Text style={s.summarySub}>{discoveredCount===items.length&&items.length>0?'Collection complete':`${Math.max(items.length-discoveredCount,0)} artifacts waiting to be discovered`}</Text></View><Ionicons name="sparkles-outline" size={24} color={GOLD}/></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{[null,...CATEGORIES].map(x=><TouchableOpacity key={x||'all'} onPress={()=>setCategory(x)} style={[s.filter,category===x&&s.filterOn]}><Text style={[s.filterText,category===x&&s.filterTextOn]}>{x||'All'}</Text></TouchableOpacity>)}</ScrollView>
  {error?<View style={s.center}><Ionicons name="cloud-offline-outline" size={48} color={GOLD}/><Text style={s.error}>{error}</Text><TouchableOpacity style={s.retry} onPress={load}><Text style={s.retryText}>Try again</Text></TouchableOpacity></View>:<FlatList data={shown} keyExtractor={x=>x.id} numColumns={2} columnWrapperStyle={s.row} contentContainerStyle={s.grid} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={s.empty}><Ionicons name="archive-outline" size={44} color="#AAA196"/><Text style={s.muted}>No artifacts in this category.</Text></View>} renderItem={({item})=><Card item={item} scanned={discovered.has(item.id)} favorite={favorites.includes(item.id)} onPress={()=>setSelected(item)} onFavorite={()=>toggleFavorite(item.id)}/>}/>} 
  <DetailModal artifact={selected} favorite={!!selected&&favorites.includes(selected.id)} onToggleFavorite={()=>selected&&toggleFavorite(selected.id)} onClose={()=>setSelected(null)}/>
 </SafeAreaView>
}

const s=StyleSheet.create({root:{flex:1},header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:12,gap:10},back:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'#F0ECE5'},eyebrow:{fontSize:9,fontWeight:'800',letterSpacing:2.2,color:GOLD},heading:{fontSize:28,fontWeight:'900',color:INK,letterSpacing:-.7},counter:{flexDirection:'row',alignItems:'baseline',paddingHorizontal:12,paddingVertical:8,borderRadius:18,backgroundColor:'#F0E8D8'},counterBig:{fontSize:17,fontWeight:'900',color:INK},counterSmall:{fontSize:12,color:'#7A7167'},summary:{marginHorizontal:16,marginBottom:12,padding:16,borderRadius:18,backgroundColor:INK,flexDirection:'row',alignItems:'center'},summaryTitle:{fontSize:15,fontWeight:'800',color:'#fff'},summarySub:{fontSize:12,color:'#C9C0B4',marginTop:3},filters:{paddingHorizontal:16,paddingBottom:12,gap:8},filter:{paddingHorizontal:14,paddingVertical:8,borderRadius:18,borderWidth:1,borderColor:'#DED7CC',backgroundColor:'#fff'},filterOn:{backgroundColor:INK,borderColor:INK},filterText:{fontSize:12,fontWeight:'700',color:'#71695F'},filterTextOn:{color:'#fff'},grid:{paddingHorizontal:14,paddingBottom:100,gap:GAP},row:{gap:GAP,marginBottom:GAP},center:{flex:1,alignItems:'center',justifyContent:'center',padding:30},muted:{marginTop:10,fontSize:13,color:'#81786E',textAlign:'center'},error:{marginTop:12,color:'#81786E',textAlign:'center'},retry:{marginTop:16,backgroundColor:INK,paddingHorizontal:22,paddingVertical:12,borderRadius:22},retryText:{color:'#fff',fontWeight:'700'},empty:{width:W-28,alignItems:'center',paddingTop:80}});
const c=StyleSheet.create({card:{width:CARD_W,borderRadius:18,overflow:'hidden',backgroundColor:'#fff',borderWidth:1,borderColor:'#E8E1D7',elevation:2,shadowColor:'#000',shadowOpacity:.06,shadowRadius:8,shadowOffset:{width:0,height:3}},locked:{backgroundColor:'#F1EEE9'},imageWrap:{height:CARD_W*.88,backgroundColor:'#DDD5C9'},image:{width:'100%',height:'100%'},lock:{position:'absolute',alignSelf:'center',top:'38%',width:42,height:42,borderRadius:21,backgroundColor:'rgba(25,22,17,.72)',alignItems:'center',justifyContent:'center'},heart:{position:'absolute',right:8,top:8,width:34,height:34,borderRadius:17,backgroundColor:'rgba(25,22,17,.68)',alignItems:'center',justifyContent:'center'},info:{padding:12,minHeight:105},category:{fontSize:9,fontWeight:'800',letterSpacing:.6,color:GOLD,textTransform:'uppercase'},title:{fontSize:14,fontWeight:'800',color:INK,lineHeight:19,marginTop:4},footer:{marginTop:'auto',paddingTop:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},status:{fontSize:10,fontWeight:'700',color:'#8C8277'}});
const d=StyleSheet.create({root:{flex:1,backgroundColor:CREAM},scroll:{paddingBottom:30},hero:{height:330,backgroundColor:INK},heroImage:{width:'100%',height:'100%'},scrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.18)'},roundBtn:{position:'absolute',top:14,width:42,height:42,borderRadius:21,backgroundColor:'rgba(20,17,13,.7)',alignItems:'center',justifyContent:'center'},category:{position:'absolute',left:18,bottom:18,paddingHorizontal:12,paddingVertical:7,borderRadius:16,backgroundColor:'rgba(20,17,13,.78)'},categoryText:{fontSize:10,fontWeight:'800',color:'#E6C477',letterSpacing:.7},content:{padding:20},name:{fontSize:30,fontWeight:'900',color:INK,letterSpacing:-.8,lineHeight:35},place:{fontSize:12,color:'#8A8177',marginTop:5},langRow:{gap:8,paddingVertical:18},langChip:{paddingHorizontal:13,paddingVertical:8,borderRadius:18,borderWidth:1,borderColor:'#DED6CA',backgroundColor:'#fff'},langChipOn:{backgroundColor:INK,borderColor:INK},langText:{fontSize:11,fontWeight:'700',color:'#71685E'},langTextOn:{color:'#fff'},section:{fontSize:10,fontWeight:'900',letterSpacing:2,color:GOLD,marginTop:4,marginBottom:9},desc:{fontSize:15,lineHeight:25,color:'#5E574F'},metaCard:{marginTop:22,borderRadius:18,backgroundColor:'#fff',paddingHorizontal:16,borderWidth:1,borderColor:'#E8E0D5'},metaItem:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14},metaDivider:{height:1,backgroundColor:'#EEE8DF'},metaLabel:{fontSize:10,color:'#9A9186',fontWeight:'700'},metaValue:{fontSize:13,color:INK,fontWeight:'700',marginTop:2},audioCard:{marginTop:18,flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:18,backgroundColor:'#fff',borderWidth:1,borderColor:'#E8E0D5'},play:{width:48,height:48,borderRadius:24,backgroundColor:INK,alignItems:'center',justifyContent:'center'},audioTitle:{fontSize:14,fontWeight:'800',color:INK},audioSub:{fontSize:11,color:'#8E857B',marginTop:2},done:{marginTop:22,backgroundColor:INK,borderRadius:24,paddingVertical:15,alignItems:'center'},doneText:{color:'#fff',fontWeight:'800',fontSize:14}});