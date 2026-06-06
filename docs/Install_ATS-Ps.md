# hi03式ATSプラグインv1.0 ATS-Ps導入方法
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
描画スクリプトの文頭に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-Psの差分を追加してください。  
```javascript
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATS_Ps_Render.js>
importPackage(Packages.org.lwjgl.input);
```
function init に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-Psの差分を追加してください。  
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
      switchButton_ps: Keyboard.KEY_1      //[オプションキー同時押し]ATS切換ボタン (1～9推奨)
    }
  }

  ats_ps = new ATS_Ps_State(atsOptions);

  // ⋮ 他のプログラムなど
}
```
function render に以下のプログラムを記述します。
```javascript
function render(entity, pass, par3) {
  // ⋮ 他のプログラムなど

  //ATS-Ps
  ats_ps.onUpdate(entity, pass); 

  // ⋮ 他のプログラムなど
}
```

## 3.音声スクリプトに組み込む
音声スクリプトの文頭に以下のプログラムを記述します。
```javascript
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATS_Ps_Sound.js>
```
function onUpdate に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-Psの差分を追加してください。  
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
    }
  }

  operationATS_Ps(su, atsSounds);

  // ⋮ 他のプログラムなど
}
```

## 4.サーバースクリプトに組み込む
サーバースクリプトの文頭に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-Psの差分を追加してください。
```javascript
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATSSelector_Server.js>
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATS_Ps_Server.js>
```
function onUpdate に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-Psの差分を追加してください。  
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
    operationATS_Ps
  ]
  var atsButtonList = {
    //"ボタン表示名": ATS_ID
    //ボタン表示名はカスタムボタンでの名前で、任意の名前を設定できます
    "ATS-Ps": "ATS-Ps"
  }
  atsSelector(entity, atsButtonList, operationATSList, atsOptions);

  // ⋮ 他のプログラムなど
}
```

## 5.カスタムボタンに組み込む
車両のjsonにカスタムボタンの項目を追加します。すでに他の設定がある場合は、ATS-Psの差分を任意の位置に追加してください。  
"ATS:OFF"は必ず配列内の先頭に記述してください。
```json
{
  "customButtons": [ 
    ["ATS:OFF", "ATS-Ps"],
    ["ATS:AutoCheck", "ATS:Manual"]
  ],
}
```
複数のATSを搭載する際の設定例

```json
{
  "customButtons": [ 
    ["ATS:OFF", "ATS-P(East)", "ATS-P(West)", "ATS-Ps"],
    ["ATS:AutoCheck", "ATS:Manual"]
  ],
}
```

# ● 開発者向け情報
### ATSの状態を取得する
ATSの状態はDataMapで管理しているため、特定のキーでデータを取得することができます
```javascript
dataMap.getBoolean("ATS-Ps_isATSBrake");//ATSブレーキ:直下地上子
dataMap.getBoolean("ATS-Ps_isPatternBrake");//ATSブレーキ:パターン抵触
dataMap.getBoolean("ATS-Ps_isATSLongBrake");//ATSブレーキ:Sn未確認
dataMap.getBoolean("ATS-Ps_isRollbackBrake");//ATSブレーキ:後退検知
dataMap.getDouble("ATS-Ps_patternSpeed");//パターン速度
dataMap.getBoolean("ATS-Ps_patternAlert");//パターン接近
dataMap.getBoolean("ATS-Ps_isLongAlert");//ATS警報ベル(ジリジリ)
dataMap.getBoolean("ATS-Ps_isAtsFault");//Ps故障
dataMap.getBoolean("ATS-Ps_isATSBrakeDisable");//ブレーキ開放
dataMap.getBoolean("ATS-Ps_hasPattern");//パターン発生
dataMap.getBoolean("ATS-Ps_isLongAlertLatched");//ATS警報持続(キンコン)
dataMap.getBoolean("ATS-Ps_acknowledgeAlert");//ATS確認ボタン押下
dataMap.getBoolean("ATS-Ps_pushAlertButton");//ATS警報持続ボタン押下
dataMap.getBoolean("ATS-Ps_isInitialize");//ATS初期化中
dataMap.getInt("ATS-Ps_maxSpeed");//列車選択スイッチの速度/列車最高速度
```
### 各種ボタンの押下について
ATSのボタン押下はDataMapで管理しているため、外部から操作することもできます。
```javascript
dataMap.setBoolean("ATS-Ps_acknowledgeAlert", isKeyDown1, 1);//ATS確認ボタン
dataMap.setBoolean("ATS-Ps_pushAlertButton", isKeyDown2, 1);//ATS警報持続ボタン
dataMap.setBoolean("ATS-Ps_pushBrakeDisableButton", isKeyDown3, 1);//ブレーキ開放ボタン
```
また、ATS復帰ボタンは以下の要領で実装すると外部から操作できます。
```javascript
if (isKeyDown4) {
  dataMap.setBoolean("ATS-Ps_isATSBrake", false, 1);
  dataMap.setBoolean("ATS-Ps_isATSLongBrake", false, 1);
  dataMap.setBoolean("ATS-Ps_isRollbackBrake", false, 1);
  dataMap.setBoolean("ATS-Ps_isPatternBrake", false, 1);
}
```
