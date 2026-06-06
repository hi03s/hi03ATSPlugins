# hi03式ATSプラグインv1.0 ATS-P・SW導入方法
### ⚠️注意⚠️
このプラグインはスクリプトを扱うため、スクリプトやパック構成に関する知識が必要になります。  
初心者お断りなシロモノなのでご注意ください。組み込み方に関する質問はお受けしません。  
<ins>自分が作者ではないパック</ins>に組み込む場合は**改造**になります。必ず許諾を取ってから改造してください。  
描画スクリプト、音声スクリプト、サーバースクリプトが導入済みである必要があります。いずれかのスクリプトがない場合は[スクリプト化スクリプト](https://drive.google.com/file/d/1_PacohCLTN1eceykNWCa1IIr4CL3siC5/view?usp=drive_link)をご利用ください。  

# ● 導入方法
## 1.スクリプトをダウンロード
[Download](https://drive.google.com/drive/folders/1Ftv9CaXNEGQdwqUMEZRu3wjXR-1p9VOu?usp=sharing)
から車両組み込みスクリプト.zipをダウンロードし、適当な場所に解凍する。

## 2.ファイルをパックにコピーする
解凍したファイルにあるTrain scripts/scriptsにあるhi03_ATS_Plugins_v1.0フォルダーを、組み込みたいパックのscriptsフォルダにコピーします。   
📁パック/assets/minecraft/scripts/hi03_ATS_Plugins_v1.0  
というファイル構成になるよう配置してください。  

## 3.描画スクリプトに組み込む
描画スクリプトの文頭に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・SWの差分を追加してください。  
```javascript
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATS_P_West_Render.js>
importPackage(Packages.org.lwjgl.input);
```
function init に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・SWの差分を追加してください。  
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
      switchButton_p_west: Keyboard.KEY_1  //[オプションキー同時押し]ATS切換ボタン (1～9推奨)
    }
  }

  ats_p_west = new ATS_P_West_State(atsOptions);

  // ⋮ 他のプログラムなど
}
```
function render に以下のプログラムを記述します。
```javascript
function render(entity, pass, par3) {
  // ⋮ 他のプログラムなど

  //ATS-P・SW
  ats_p_west.onUpdate(entity, pass); 

  // ⋮ 他のプログラムなど
}
```

## 4.音声スクリプトに組み込む
音声スクリプトの文頭に以下のプログラムを記述します。
```javascript
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATS_P_West_Sound.js>
```
function onUpdate に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・SWの差分を追加してください。  
下記のコードの音声名は一例です。任意の音声名に差し替えてください。
```javascript
function onUpdate(su) {
  var atsSounds = {
    soundList: {
      //ATS-Sx
      pushButton1: "sound_hi03nex_ps:pushButton", //ATS確認ボタン押下
      pushButton2: "sound_hi03nex_ps:pushButton", //ATS警報持続ボタン押下
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
      //ATS-P
      atsPBrake: "sound_hi03nex_ps:ATSPAnnounce" //ATS-P非常ブレーキ動作 [ループ音]
    }
  }

  operationATS_P_West(su, atsSounds);

  // ⋮ 他のプログラムなど
}
```

## 5.サーバースクリプトに組み込む
サーバースクリプトの文頭に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・SWの差分を追加してください。
```javascript
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATSSelector_Server.js>
//include <scripts/hi03_ATS_Plugins_v1.0/lib_ATS_P_West_Server.js>
```
function onUpdate に以下のプログラムを記述します。すでに他のATSの設定がある場合は、ATS-P・SWの差分を追加してください。  
必要に応じて設定を変更してください。
```javascript
function onUpdate(entity, scriptExecuter) {
  // ⋮ 他のプログラムなど

  var atsOptions = {
    MaxBrakeNotch: -8,       //非常ブレーキのノッチ
    BrakeDeceleration: -2.5, //ブレーキパターン減速度[km/h/s](ATS-P、ATS-Ps用)
    MaxSpeed: 130,           //車両の最高速度[km/h](ATS-P、ATS-Ps用)
    IsOldType : false        //ATS切り替えタイプ 主に115系や211系などの古い車両向け(ATS-P用)
  };
  var operationATSList = [
    //operationATS_〇〇関数を追加
    operationATS_P_West
  ]
  var atsButtonList = {
    //"ボタン表示名": ATS_ID
    //ボタン表示名はカスタムボタンでの名前で、任意の名前を設定できます
    "ATS-P(West)": "ATS-P_West"
  }
  atsSelector(entity, atsButtonList, operationATSList, atsOptions);

  // ⋮ 他のプログラムなど
}
```

## 6.カスタムボタンに組み込む
車両のjsonにカスタムボタンの項目を追加します。すでに他の設定がある場合は、ATS-P・SWの差分を任意の位置に追加してください。  
"ATS:OFF"は必ず配列内の先頭に記述してください。
```json
{
  "customButtons": [ 
    ["ATS:OFF", "ATS-P(West)"],
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
dataMap.getBoolean("ATS-P_West_isATSBrake");//ATSブレーキ:直下地上子
dataMap.getBoolean("ATS-P_West_isPatternBrake");//ATSブレーキ:パターン抵触
dataMap.getBoolean("ATS-P_West_isPatternBrakeFull");//ATSブレーキ:パターン抵触
dataMap.getBoolean("ATS-P_West_isATSLongBrake");//ATSブレーキ:Sn未確認
dataMap.getBoolean("ATS-P_West_isRollbackBrake");//ATSブレーキ:後退検知
dataMap.getDouble("ATS-P_West_patternSpeed");//パターン速度
dataMap.getBoolean("ATS-P_West_patternAlert");//パターン接近
dataMap.getBoolean("ATS-P_West_isLongAlert");//ATS警報ベル(ジリジリ)
dataMap.getBoolean("ATS-P_West_isAtsFault");//P故障
dataMap.getBoolean("ATS-P_West_isATSBrakeDisable");//ブレーキ開放
dataMap.getBoolean("ATS-P_West_isLongAlertLatched");//ATS警報持続(キンコン)
dataMap.getBoolean("ATS-P_West_acknowledgeAlert");//ATS確認ボタン押下
dataMap.getBoolean("ATS-P_West_pushAlertButton");//ATS警報持続ボタン押下
dataMap.getBoolean("ATS-P_West_isInitialize");//ATS初期化中
dataMap.getBoolean("ATS-P_West_isActiveATSP");//ATS-P有効化
dataMap.getBoolean("ATS-P_West_isATSPBrake");//ATS-P非常ブレーキ(直下地上子)
dataMap.getString("ATS-P_West_ATSPMode");//ATS-Pモード(東:"East", 西:"West")
```
### 各種ボタンの押下について
ATSのボタン押下はDataMapで管理しているため、外部から操作することもできます。
```javascript
dataMap.setBoolean("ATS-P_West_acknowledgeAlert", isKeyDown1, 1);//ATS確認ボタン
dataMap.setBoolean("ATS-P_West_pushAlertButton", isKeyDown2, 1);//ATS警報持続ボタン
dataMap.setBoolean("ATS-P_West_pushBrakeDisableButton", isKeyDown3, 1);//ブレーキ開放ボタン
```
また、ATS復帰ボタンは以下の要領で実装すると外部から操作できます。
```javascript
if (isKeyDown4) {
  dataMap.setBoolean("ATS-P_West_isATSBrake", false, 1);
  dataMap.setBoolean("ATS-P_West_isATSPBrake", false, 1);
  dataMap.setBoolean("ATS-P_West_isATSLongBrake", false, 1);
  dataMap.setBoolean("ATS-P_West_isPatternBrake", false, 1);
  dataMap.setBoolean("ATS-P_West_isPatternBrakeFull", false, 1);
  dataMap.setBoolean("ATS-P_West_isRollbackBrake", false, 1);
}
```
