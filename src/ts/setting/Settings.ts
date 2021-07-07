// settings 保存了下载器的所有设置项
// 每当修改了 settings 的任何一个值，都会触发 EVT.list.settingChange 事件，传递这个选项的名称和值 {name:string, value:any}

// 如果打开了多个标签页，每个页面的 settings 数据是互相独立的。但是 localStorage 里的数据只有一份：最后一个设置变更是在哪个页面发生的，就把哪个页面的 settings 保存到 localStorage 里。所以恢复设置时，恢复的也是这个页面的设置。

import { EVT } from '../EVT'
import { Utils } from '../utils/Utils'
import { convertOldSettings } from './ConvertOldSettings'
import { msgBox } from '../MsgBox'
import { Config } from '../config/Config'
import { secretSignal } from '../utils/SecretSignal'
import { toast } from '../Toast'

export interface BlockTagsForSpecificUserItem {
  uid: number
  user?: string
  tags: string[]
}

type SettingValue = string | number | boolean | string[] | number[] | object[]

export interface SettingChangeData {
  name: SettingsKeys
  value: SettingValue
}

interface XzSetting {
  setWantPage: number
  wantPageArr: number[]
  firstFewImagesSwitch: boolean
  firstFewImages: number
  multiImageWorkImageLimitSwitch: boolean
  multiImageWorkImageLimit: number
  downType0: boolean
  downType1: boolean
  downType2: boolean
  downType3: boolean
  downSingleImg: boolean
  downMultiImg: boolean
  downColorImg: boolean
  downBlackWhiteImg: boolean
  downNotBookmarked: boolean
  downBookmarked: boolean
  ugoiraSaveAs: 'webm' | 'gif' | 'zip' | 'png'
  convertUgoiraThread: number
  needTagSwitch: boolean
  notNeedTagSwitch: boolean
  needTag: string[]
  notNeedTag: string[]
  quietDownload: boolean
  downloadThread: number
  userSetName: string
  namingRuleList: string[]
  tagNameToFileName: boolean
  workDir: boolean
  workDirFileNumber: number
  workDirName: 'id' | 'rule'
  showOptions: boolean
  postDate: boolean
  postDateStart: number
  postDateEnd: number
  previewResult: boolean
  BMKNumSwitch: boolean
  BMKNumMin: number
  BMKNumMax: number
  BMKNumAverageSwitch: boolean
  BMKNumAverage: number
  setWHSwitch: boolean
  widthHeightLimit: '>=' | '=' | '<='
  setWidthAndOr: '&' | '|'
  setWidth: number
  setHeight: number
  ratioSwitch: boolean
  ratio: 'square' | 'horizontal' | 'vertical' | 'userSet'
  userRatio: number
  idRangeSwitch: boolean
  idRangeInput: number
  idRange: '>' | '<'
  noSerialNo: boolean
  filterBlackWhite: boolean
  sizeSwitch: boolean
  sizeMin: number
  sizeMax: number
  novelSaveAs: 'txt' | 'epub'
  saveNovelMeta: boolean
  deduplication: boolean
  dupliStrategy: 'strict' | 'loose'
  fileNameLengthLimitSwitch: boolean
  fileNameLengthLimit: number
  imageSize: 'original' | 'regular' | 'small'
  dateFormat: string
  userSetLang: 'zh-cn' | 'zh-tw' | 'ja' | 'en' | 'auto'
  bmkAfterDL: boolean

  // 选项在表单中的值
  widthTag: 'yes' | 'no'
  // 根据表单中的值转换为实际使用的值
  widthTagBoolean: boolean

  // 选项在表单中的值
  restrict: 'yes' | 'no'
  // 根据表单中的值转换为实际使用的值
  restrictBoolean: boolean

  userBlockList: boolean
  blockList: string[]
  needTagMode: 'all' | 'one'
  theme: 'auto' | 'white' | 'dark'
  r18Folder: boolean
  r18FolderName: string
  blockTagsForSpecificUser: boolean
  blockTagsForSpecificUserShowList: boolean
  blockTagsForSpecificUserList: BlockTagsForSpecificUserItem[]
  magnifier: boolean
  magnifierSize: 'original' | 'regular'
  magnifierPosition: 'left' | 'right'
  bgDisplay: boolean
  bgOpacity: number
  bgPositionY: 'center' | 'top'
  createFolderByType: boolean
  createFolderByTypeIllust: boolean
  createFolderByTypeManga: boolean
  createFolderByTypeUgoira: boolean
  createFolderByTypeNovel: boolean
  createFolderByTag: boolean
  createFolderTagList: string[]
  createFolderBySl: boolean
  downloadUgoiraFirst: boolean
  downAllAges: boolean
  downR18: boolean
  downR18G: boolean
  switchTabBar: 'over' | 'click'
  zeroPadding: boolean
  zeroPaddingLength: number
  tagMatchMode: 'partial' | 'whole'
}

type SettingsKeys = keyof XzSetting

class Settings {
  constructor() {
    this.restore()

    this.bindEvents()
  }

  // 默认设置
  private readonly defaultSettings: XzSetting = {
    setWantPage: -1,
    wantPageArr: [
      -1, -1, -1, -1, -1, 1000, -1, 500, -1, 1000, 100, -1, 100, -1, -1, 1000,
      100, 100, 100, 100, -1,
    ],
    firstFewImagesSwitch: false,
    firstFewImages: 1,
    multiImageWorkImageLimitSwitch: false,
    multiImageWorkImageLimit: 10,
    downType0: true,
    downType1: true,
    downType2: true,
    downType3: true,
    downAllAges: true,
    downR18: true,
    downR18G: true,
    downSingleImg: true,
    downMultiImg: true,
    downColorImg: true,
    downBlackWhiteImg: true,
    downNotBookmarked: true,
    downBookmarked: true,
    ugoiraSaveAs: 'webm',
    convertUgoiraThread: 1,
    needTag: [],
    notNeedTag: [],
    quietDownload: true,
    downloadThread: 5,
    userSetName: '{id}',
    namingRuleList: [],
    tagNameToFileName: false,
    workDir: false,
    workDirFileNumber: 1,
    workDirName: 'id',
    showOptions: true,
    postDate: false,
    postDateStart: 946684800000,
    postDateEnd: 4102444800000,
    previewResult: true,
    BMKNumSwitch: false,
    BMKNumMin: 0,
    BMKNumMax: Config.BookmarkCountLimit,
    BMKNumAverageSwitch: false,
    BMKNumAverage: 600,
    setWHSwitch: false,
    widthHeightLimit: '>=',
    setWidthAndOr: '&',
    setWidth: 0,
    setHeight: 0,
    ratioSwitch: false,
    ratio: 'horizontal',
    userRatio: 1.4,
    idRangeSwitch: false,
    idRangeInput: 0,
    idRange: '>',
    needTagSwitch: false,
    notNeedTagSwitch: false,
    noSerialNo: false,
    filterBlackWhite: false,
    sizeSwitch: false,
    sizeMin: 0,
    sizeMax: 100,
    novelSaveAs: 'txt',
    saveNovelMeta: false,
    deduplication: false,
    dupliStrategy: 'loose',
    fileNameLengthLimitSwitch: false,
    fileNameLengthLimit: 200,
    imageSize: 'original',
    dateFormat: 'YYYY-MM-DD',
    userSetLang: 'auto',
    bmkAfterDL: false,
    widthTag: 'yes',
    restrict: 'no',
    widthTagBoolean: true,
    restrictBoolean: false,
    userBlockList: false,
    blockList: [],
    theme: 'auto',
    needTagMode: 'all',
    r18Folder: false,
    r18FolderName: '[R-18&R-18G]',
    blockTagsForSpecificUser: false,
    blockTagsForSpecificUserShowList: true,
    blockTagsForSpecificUserList: [],
    magnifier: true,
    magnifierSize: 'regular',
    magnifierPosition: 'right',
    bgDisplay: false,
    bgOpacity: 50,
    bgPositionY: 'center',
    createFolderByType: false,
    createFolderByTypeIllust: false,
    createFolderByTypeManga: false,
    createFolderByTypeUgoira: false,
    createFolderByTypeNovel: false,
    createFolderByTag: false,
    createFolderTagList: [],
    createFolderBySl: false,
    downloadUgoiraFirst: false,
    switchTabBar: 'over',
    zeroPadding: false,
    zeroPaddingLength: 3,
    tagMatchMode: 'partial',
  }

  private allSettingKeys = Object.keys(this.defaultSettings)

  // 值为浮点数的选项
  private floatNumberKey = ['userRatio', 'sizeMin', 'sizeMax']

  // 值为整数的选项不必单独列出

  // 值为数字数组的选项
  private numberArrayKey = ['wantPageArr']

  // 值为字符串数组的选项
  private stringArrayKey = [
    'namingRuleList',
    'blockList',
    'needTag',
    'notNeedTag',
    'createFolderTagList',
  ]

  // 以默认设置作为初始设置
  public settings: XzSetting = Utils.deepCopy(this.defaultSettings)

  private bindEvents() {
    // 当设置发生变化时进行本地存储
    window.addEventListener(EVT.list.settingChange, () => {
      localStorage.setItem(
        Config.settingStoreName,
        JSON.stringify(this.settings)
      )
    })

    window.addEventListener(EVT.list.resetSettings, () => {
      this.reset()
    })

    window.addEventListener(EVT.list.exportSettings, () => {
      this.exportSettings()
    })

    window.addEventListener(EVT.list.importSettings, () => {
      this.importSettings()
    })

    // 切换只选择动图/选择全部作品类型
    const codes = ['onlyugoira', 'qw222']
    for (const code of codes) {
      secretSignal.register(code, () => {
        // 如果只有动图被选中，则选择全部作品类型
        // 反之，只选择动图
        if (
          this.settings.downType2 &&
          !this.settings.downType0 &&
          !this.settings.downType1 &&
          !this.settings.downType3
        ) {
          this.settings.downType0 = true
          this.settings.downType1 = true
          this.settings.downType3 = true
          // 多次修改只触发一次改变事件，提高效率
          this.setSetting('downType0', true)
          toast.warning('onlyUgoira off')
        } else {
          this.settings.downType0 = false
          this.settings.downType1 = false
          this.settings.downType2 = true
          this.settings.downType3 = false
          this.setSetting('downType2', true)
          toast.success('onlyUgoira on')
        }
      })
    }
  }

  // 初始化时，恢复设置
  private restore() {
    let restoreData = this.defaultSettings
    const savedSettings = localStorage.getItem(Config.settingStoreName)
    if (savedSettings) {
      restoreData = JSON.parse(savedSettings)
    }
    this.assignSettings(restoreData)
  }

  // 接收整个设置项，通过循环将其更新到 settings 上
  // 循环设置而不是整个替换的原因：
  // 1. 进行类型转换，如某些设置项是 number ，但是数据来源里是 string，setSetting 可以把它们转换到正确的类型
  // 2. 某些选项在旧版本里没有，所以不能用旧的设置整个覆盖
  private assignSettings(data: XzSetting) {
    const origin = Utils.deepCopy(data)
    for (const [key, value] of Object.entries(origin)) {
      this.setSetting(key as SettingsKeys, value)
    }
  }

  private exportSettings() {
    const blob = Utils.json2Blob(this.settings)
    const url = URL.createObjectURL(blob)
    Utils.downloadFile(url, Config.appName + ` Settings.json`)
  }

  private async importSettings() {
    const loadedJSON = (await Utils.loadJSONFile().catch((err) => {
      return msgBox.error(err)
    })) as XzSetting
    if (!loadedJSON) {
      return
    }
    // 检查是否存在设置里的属性
    if (loadedJSON.downloadThread === undefined) {
      return msgBox.error('Format error!')
    }
    // 开始恢复导入的设置
    this.reset(loadedJSON)
  }

  // 重置设置
  // 可选参数：传递一份设置数据，用于从配置文件导入，恢复设置
  private reset(data?: XzSetting) {
    this.assignSettings(data ? data : this.defaultSettings)
    EVT.fire('resetSettingsEnd')
  }

  private tipError(key: string) {
    msgBox.error(`${key}: Invalid value`)
  }

  // 处理用户设置的命名规则，对一些非法情况进行处理。
  // 这里不必处理得非常详尽，因为在生成文件名时，还会对结果进行处理
  // 测试用例：在作品页面内使用下面的命名规则，会自动进行更正
  // /{p_tag}/|/{user}////<//{rank}/{px}/{sl}/{p_tag}///{id}-{user}-{user_id}""-?{tags_transl_only}////
  private handleUserSetName(val: string) {
    // 命名规则为空时使用 {id}
    let result = val || '{id}'

    // 替换命名规则里可能存在的非法字符
    result = Utils.replaceUnsafeStr(result)
    // replaceUnsafeStr 会把斜线 / 替换成全角的斜线 ／，这里再替换回来，否则就不能建立文件夹了
    result = result.replace(/／/g, '/')

    // 处理连续的 /
    result = result.replace(/\/{2,100}/g, '/')

    // 如果命名规则头部或者尾部是 / 则去掉
    if (result.startsWith('/')) {
      result = result.replace('/', '')
    }
    if (result.endsWith('/')) {
      result = result.substr(0, result.length - 1)
    }

    return result
  }

  // 更改设置项
  // 其他模块应该通过这个方法更改设置
  // 这里面有一些类型转换的代码，主要目的：
  // 1. 兼容旧版本的设置。读取旧版本的设置时，将其转换成新版本的设置。例如某个设置在旧版本里是 string 类型，值为 'a,b,c'。新版本里是 string[] 类型，这里会自动将其转换成 ['a','b','c']
  // 2. 减少额外操作。例如某个设置的类型为 string[]，其他模块可以传递 string 类型的值如 'a,b,c'，而不必先把它转换成 string[]
  public setSetting(key: SettingsKeys, value: SettingValue) {
    if (!this.allSettingKeys.includes(key)) {
      return
    }

    const keyType = typeof this.defaultSettings[key]
    const valueType = typeof value

    // 把旧的设置值转换为新的设置值。需要转换的值都是 string 类型
    if (valueType === 'string') {
      value = convertOldSettings.convert(key, value as string)
    }

    // 将传入的值转换成选项对应的类型
    if (keyType === 'string' && valueType !== 'string') {
      value = value.toString()
    }

    if (keyType === 'number' && valueType !== 'number') {
      // 时间是需要特殊处理的 number 类型
      if (key === 'postDateStart' || key == 'postDateEnd') {
        if (valueType === 'string') {
          if (value === '') {
            // 如果日期是空字符串，则替换为默认值
            value = this.defaultSettings[key]
          } else {
            // 把日期字符串转换成时间戳
            const date = new Date(value as string)
            value = date.getTime()
          }
        }
      } else {
        // 处理普通的 number 类型
        if (this.floatNumberKey.includes(key)) {
          value = Number.parseFloat(value as any)
        } else {
          value = Number.parseInt(value as any)
        }
      }

      if (isNaN(value as number)) {
        return this.tipError(key)
      }
    }

    if (keyType === 'boolean' && valueType !== 'boolean') {
      value = !!value
    }

    if (Array.isArray(this.defaultSettings[key])) {
      if (this.stringArrayKey.includes(key)) {
        // 字符串转换成 string[]
        if (valueType === 'string') {
          value = Utils.string2array(value as string)
        }
      }

      if (this.numberArrayKey.includes(key)) {
        // 把数组转换成 number[]
        if (Array.isArray(value)) {
          value = (value as any[]).map((val: string | number) => {
            if (typeof val !== 'number') {
              return Number(val)
            } else {
              return val
            }
          })
        } else {
          return
        }
      }
    }

    // 对于一些不合法的值，重置为默认值
    if (key === 'firstFewImages' && value < 1) {
      value = this.defaultSettings[key]
    }

    if (key === 'setWidthAndOr' && value === '') {
      value = this.defaultSettings[key]
    }

    // 对命名规则进行合法化处理
    if (key === 'userSetName') {
      value = this.handleUserSetName(value as string)
    }

    // 更改设置
    ;(this.settings[key] as any) = value

    // 当修改某些设置时，顺便修改和它有对应关系的设置
    if (key === 'widthTag') {
      this.settings.widthTagBoolean = value === 'yes'
    }
    if (key === 'restrict') {
      this.settings.restrictBoolean = value === 'yes'
    }

    // 触发设置变化的事件
    EVT.fire('settingChange', { name: key, value: value })
  }
}

const self = new Settings()
const settings = self.settings
const setSetting = self.setSetting.bind(self)

export { settings, setSetting, SettingsKeys as SettingKeys }
