# hi03式ATSプラグインv1.0 ATS-P・Ps導入方法
### ⚠️注意⚠️
このプラグインはスクリプトを扱うため、スクリプトやパック構成に関する知識が必要になります。  
初心者お断りなシロモノなのでご注意ください。組み込み方に関する質問はお受けしません。  
<ins>自分が作者ではないパック</ins>に組み込む場合は**改造**になります。必ず許諾を取ってから改造してください。  
描画スクリプト、音声スクリプト、サーバースクリプトが導入済みである必要があります。いずれかのスクリプトがない場合は[スクリプト化スクリプト](https://drive.google.com/file/d/1_PacohCLTN1eceykNWCa1IIr4CL3siC5/view?usp=drive_link)をご利用ください。  

# ● 導入方法
## 1.ファイルをパックにコピーする
Train scripts/scriptsにあるhi03_ATS_Plugins_v1.0フォルダーを、組み込みたいパックのscriptsフォルダにコピーします。  
📁パック/assets/minecraft/scripts/hi03_ATS_Plugins_v1.0  
というファイル構成になるよう配置してください。  

## 2.描画スクリプトに組み込む
描画スクリプトの文頭に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・Psの差分を追加してください。  
```javascript
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATS_P_Ps_Render.js>
importPackage(Packages.org.lwjgl.input);
```
function init に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・Psの差分を追加してください。   
必要に応じて設定を変更してください。
```javascript
function init(par1, par2) {
  // ⋮ 他のプログラムなど

  var atsOptions = {
    MaxBrakeNotch: -8, //非常ブレーキのノッチ
    KeyMap: {          //キー設定
      optionKey: Keyboard.KEY_LCONTROL, //オプションキー
      atsButton: Keyboard.KEY_SPACE,    //ATS確認ボタン / [オプションキー同時押し]ATS警報持続ボタン
      disableButton: Keyboard.KEY_BACK, //ATS復帰ボタン / [オプションキー同時押し]ブレーキ開放ボタン
      switchButton_off: Keyboard.KEY_0,    //[オプションキー同時押し]ATS:OFFボタン (0推奨)
      switchButton_p_ps: Keyboard.KEY_1    //[オプションキー同時押し]ATS切換ボタン (1～9推奨)
    }
  }

  ats_p_ps = new ATS_P_Ps_State(atsOptions);

  // ⋮ 他のプログラムなど
}
```
function render に以下のプログラムを記述します。
```javascript
function render(entity, pass, par3) {
  // ⋮ 他のプログラムなど

  //ATS-P・Ps
  ats_p_ps.onUpdate(entity, pass); 

  // ⋮ 他のプログラムなど
}
```

## 3.音声スクリプトに組み込む
音声スクリプトの文頭に以下のプログラムを記述します。
```javascript
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATS_P_Ps_Sound.js>
```
function onUpdate に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・Psの差分を追加してください。  
下記のコードの音声名は一例です。任意の音声名に差し替えてください。
```javascript
function onUpdate(su) {
  var atsSounds = {
    soundList: {
      //ATS-Sx
      pushButton1: "sound_hi03nex_ps:pushButton", //ATS確認ボタン押下
      pushButton2: "sound_hi03nex_ps:pushButton", //ATS警報持続ボタン押下
      //ATS-Ps
      patternPsStart: "sound_hi03nex_ps:patternStart",      //パターン発生(ATS-Ps)
      patternPsEnd: "sound_hi03nex_ps:patternEnd",          //パターン終了(ATS-Ps)
      patternPsApproachingOn: "sound_hi03nex_ps:psChime1",  //パターン接近ON(ATS-Ps)
      patternPsApproachingOff: "sound_hi03nex_ps:psChime1", //パターン接近OFF(ATS-Ps)
      patternPsOver: "sound_hi03nex_ps:psChime1",           //パターン抵触(ATS-Ps)
      //ATS-P
      patternPApproachingOn: "sound_hi03nex_ps:bell1",  //パターン接近ON(ATS-P)
      patternPApproachingOff: "sound_hi03nex_ps:bell1", //パターン接近OFF(ATS-P)
      patternPOver: "sound_hi03nex_ps:bell1",           //パターン抵触(ATS-P)
      initialize: "sound_hi03nex_ps:bell1",             //初期化完了
      atsPActivate: "sound_hi03nex_ps:bell1",           //ATS-P有効化
      switchToWest: "sound_hi03nex_ps:bell1",           //ATS-P切り替え(東→西)
      switchToEast: "sound_hi03nex_ps:bell1"            //ATS-P切り替え(西→東)
    },
    loopSoundList: {
      //ATS-Sx
      atsBrakeDirect: "sound_hi03nex_ps:bell2", //ATSブレーキ:直下地上子 [ループ音]
      atsBrakeLong: "sound_hi03nex_ps:bell2",   //ATSブレーキ:Sx未確認 [ループ音]
      alert1: "sound_hi03nex_ps:bell2",         //ATS警報ベル(ジリジリ) [ループ音]
      alert2: "sound_hi03nex_ps:bell3",         //ATS警報持続(キンコン) [ループ音]
      //ATS-Ps
      atsPsBrakeDirect: "sound_hi03nex_ps:bell2",   //ATS非常ブレーキ(ATS-Ps):直下地上子 [ループ音]
      atsPsBrakePattern: "sound_hi03nex_ps:bell2",  //ATS非常ブレーキ(ATS-Ps):パターン抵触 [ループ音]
      atsPsBrakeLong: "sound_hi03nex_ps:bell2",     //ATS非常ブレーキ(ATS-Ps):Sn未確認 [ループ音]
      atsPsBrakeRollback: "sound_hi03nex_ps:bell2", //ATS非常ブレーキ(ATS-Ps):後退検知 [ループ音]
      //ATS-P
      atsPBrake: "sound_hi03nex_ps:ATSPAnnounce" //ATS-P非常ブレーキ動作 [ループ音]
    }
  }

  operationATS_P_Ps(su, atsSounds);

  // ⋮ 他のプログラムなど
}
```

## 4.サーバースクリプトに組み込む
サーバースクリプトの文頭に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・Psの差分を追加してください。
```javascript
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATSSelector_Server.js>
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATS_P_Ps_Server.js>
```
function onUpdate に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・Psの差分を追加してください。  
必要に応じて設定を変更してください。
```javascript
function onUpdate(entity, scriptExecuter) {
  // ⋮ 他のプログラムなど

  var atsOptions = {
    MaxBrakeNotch: -8,       //非常ブレーキのノッチ
    BrakeDeceleration: -2.5, //ブレーキパターン減速度[km/h/s](ATS-P、ATS-Ps用)
    MaxSpeed: 130            //車両の最高速度[km/h](ATS-P、ATS-Ps用)
  };
  var operationATSList = [
    //operationATS_〇〇関数を追加
    operationATS_P_Ps
  ]
  var atsButtonList = {
    //"ボタン表示名": ATS_ID
    //ボタン表示名はカスタムボタンでの名前で、任意の名前を設定できます
    "ATS-P/Ps": "ATS-P_Ps"
  }
  atsSelector(entity, atsButtonList, operationATSList, atsOptions);

  // ⋮ 他のプログラムなど
}
```

## 5.カスタムボタンに組み込む
車両のjsonにカスタムボタンの項目を追加します。すでに他の設定がある場合は、ATS-P・Psの差分を任意の位置に追加してください。  
"ATS:OFF"は必ず配列内の先頭に記述してください。
```json
{
  "customButtons": [ 
    ["ATS:OFF", "ATS-P/Ps"],
    ["ATS:AutoCheck", "ATS:Manual"]
  ],
}
```
複数のATSを搭載する際の設定例

```json
{
  "customButtons": [ 
    ["ATS:OFF", "ATS-P(East)", "ATS-P(West)", "ATS-P/Ps"],
    ["ATS:AutoCheck", "ATS:Manual"]
  ],
}
```

# ● 開発者向け情報
### ATSの状態を取得する
ATSの状態はDataMapで管理しているため、特定のキーでデータを取得することができます
```javascript
dataMap.getBoolean("ATS-P_Ps_isInitialize");//ATS初期化中
dataMap.getBoolean("ATS-P_Ps_isLongAlert");//ATS警報ベル(ジリジリ)
dataMap.getBoolean("ATS-P_Ps_isLongAlertLatched");//ATS警報持続(キンコン)
dataMap.getBoolean("ATS-P_Ps_isAtsFault");//Ps故障
dataMap.getBoolean("ATS-P_Ps_isATSBrakeDisable");//ブレーキ開放
dataMap.getBoolean("ATS-P_Ps_acknowledgeAlert");//ATS確認ボタン押下
dataMap.getBoolean("ATS-P_Ps_pushAlertButton");//ATS警報持続ボタン押下
dataMap.getBoolean("ATS-P_Ps_isATSBrake");//ATS非常ブレーキ:直下地上子(ATS-Ps/Sx)
dataMap.getBoolean("ATS-P_Ps_isATSLongBrake");//ATS非常ブレーキ:Sn未確認(ATS-Ps/Sx)
dataMap.getBoolean("ATS-P_Ps_isRollbackBrake");//ATS非常ブレーキ:後退検知(ATS-Ps)
dataMap.getBoolean("ATS-P_Ps_isPatternBrake_Ps");//ATS非常ブレーキ:パターン抵触(ATS-Ps)
dataMap.getBoolean("ATS-P_Ps_hasPattern_Ps");//パターン発生(ATS-Ps)
dataMap.getBoolean("ATS-P_Ps_patternAlert_Ps");//パターン接近(ATS-Ps)
dataMap.getDouble("ATS-P_Ps_patternSpeed_Ps");//パターン速度(ATS-Ps)
dataMap.getBoolean("ATS-P_Ps_isActiveATSP");//ATS-P有効化
dataMap.getBoolean("ATS-P_Ps_isATSPBrake");//ATS-P非常ブレーキ(直下地上子)
dataMap.getBoolean("ATS-P_Ps_isPatternBrake");//ATS-P常用ブレーキ:パターン抵触(ATS-P)
dataMap.getBoolean("ATS-P_Ps_isPatternBrakeFull");//ATS-P常用ブレーキ:パターン抵触(ATS-P)
dataMap.getString("ATS-P_Ps_ATSPMode");//ATS-Pモード(東:"East", 西:"West")
dataMap.getBoolean("ATS-P_Ps_patternAlert");//パターン接近(ATS-P)
dataMap.getDouble("ATS-P_Ps_patternSpeed");//パターン速度(ATS-P)
```
### 各種ボタンの押下について
ATSのボタン押下はDataMapで管理しているため、外部から操作することもできます。
```javascript
dataMap.setBoolean("ATS-P_Ps_acknowledgeAlert", isKeyDown1, 1);//ATS確認ボタン
dataMap.setBoolean("ATS-P_Ps_pushAlertButton", isKeyDown2, 1);//ATS警報持続ボタン
dataMap.setBoolean("ATS-P_Ps_pushBrakeDisableButton", isKeyDown3, 1);//ブレーキ開放ボタン
```
また、ATS復帰ボタンは以下の要領で実装すると外部から操作できます。
```javascript
if (isKeyDown4) {
  dataMap.setBoolean("ATS-P_Ps_isATSBrake", false, 1);
  dataMap.setBoolean("ATS-P_Ps_isATSPBrake", false, 1);
  dataMap.setBoolean("ATS-P_Ps_isATSLongBrake", false, 1);
  dataMap.setBoolean("ATS-P_Ps_isPatternBrake", false, 1);
  dataMap.setBoolean("ATS-P_Ps_isPatternBrakeFull", false, 1);
  dataMap.setBoolean("ATS-P_Ps_isRollbackBrake", false, 1);
  dataMap.setBoolean("ATS-P_Ps_isPatternBrake_Ps", false, 1);
}
```

