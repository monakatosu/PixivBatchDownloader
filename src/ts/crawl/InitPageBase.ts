// 初始化所有页面抓取流程的基类
import { lang } from '../Lang'
import { Colors } from '../config/Colors'
import { Tools } from '../Tools'
import { API } from '../API'
import { store } from '../store/Store'
import { log } from '../Log'
import { EVT } from '../EVT'
import { options } from '../setting/Options'
import { settings } from '../setting/Settings'
import { states } from '../store/States'
import { saveArtworkData } from '../store/SaveArtworkData'
import { saveNovelData } from '../store/SaveNovelData'
import { mute } from '../filter/Mute'
import { IDData } from '../store/StoreType'
import '../SelectWork'
import { destroyManager } from '../pageFunciton/DestroyManager'
import { vipSearchOptimize } from './VipSearchOptimize'
import { ArtworkData, NovelData } from './CrawlResult.d'
import { toast } from '../Toast'
import { msgBox } from '../MsgBox'
import { Utils } from '../utils/Utils'
import { pageType } from '../PageType'

abstract class InitPageBase {
  protected crawlNumber = 0 // 要抓取的个数/页数

  // protected maxCount = 1000 // 当前页面类型最多有多少个页面/作品
  protected maxCount = 100000 // 当前页面类型最多有多少个页面/作品 (勝手に変えた)

  protected startpageNo = 1 // 列表页开始抓取时的页码，只在 api 需要页码时使用。目前有搜索页、排行榜页、新作品页、系列页面使用。

  protected listPageFinished = 0 // 记录一共抓取了多少个列表页。使用范围同上。

  protected readonly ajaxThreadsDefault = 10 // 抓取时的并发连接数默认值，也是最大值

  protected ajaxThread = this.ajaxThreadsDefault // 抓取时的并发请求数

  protected finishedRequest = 0 // 抓取作品之后，如果 id 队列为空，则统计有几个并发线程完成了请求。当这个数量等于 ajaxThreads 时，说明所有请求都完成了

  protected crawlStopped = false // 抓取是否已停止

  // 子组件不应该修改 init 方法，但可以重载里面的方法
  protected init() {
    options.showAllOption()
    this.setFormOption()
    this.addCrawlBtns()
    this.addAnyElement()
    this.initAny()

    // 注册当前页面的 destroy 函数
    destroyManager.register(this.destroy.bind(this))

    // 切换页面时，如果任务已经完成，则清空输出区域，避免日志一直堆积。
    EVT.bindOnce('clearLogAfterPageSwitch', EVT.list.pageSwitch, () => {
      if (!states.busy) {
        EVT.fire('clearLog')
      }
    })

    // 监听下载 id 列表的事件
    EVT.bindOnce('crawlIdList', EVT.list.crawlIdList, (ev: CustomEventInit) => {
      const idList = ev.detail.data as IDData[]
      if (idList) {
        this.crawlIdList(idList)
      }
    })
  }

  // 设置表单里的选项。主要是设置页数，隐藏不需要的选项。
  protected setFormOption(): void {
    // 个数/页数选项的提示
    options.setWantPageTip({
      text: lang.transl('_页数'),
      tip: lang.transl('_从本页开始下载提示'),
      rangTip: lang.transl('_数字提示1'),
    })
  }

  // 添加抓取区域的按钮
  protected addCrawlBtns() {
    Tools.addBtn('crawlBtns', Colors.bgBlue, lang.transl('_开始抓取'), [
      ['title', lang.transl('_开始抓取') + lang.transl('_默认下载多页')],
    ]).addEventListener('click', () => {
      this.readyCrawl()
    })
  }

  // 添加其他任意元素（如果有）
  protected addAnyElement(): void {}

  // 初始化任意内容
  // 如果有一些代码不能归纳到 init 方法的前面几个方法里，那就放在这里
  // 通常用来初始化特有的组件、功能、事件、状态等
  protected initAny() {}

  // 销毁初始化页面时添加的元素和事件，恢复设置项等
  protected destroy(): void {
    Tools.clearSlot('crawlBtns')
    Tools.clearSlot('otherBtns')
  }

  // 作品个数/页数的输入不合法
  private getWantPageError() {
    EVT.fire('wrongSetting')
    const msg = lang.transl('_参数不合法')
    msgBox.error(msg)
    throw new Error(msg)
  }

  // 在某些页面检查页数/个数设置
  // 可以为 -1，或者大于 0
  protected checkWantPageInput(crawlPartTip: string, crawlAllTip: string) {
    const want = settings.wantPageArr[pageType.type]

    // 如果比 1 小，并且不是 -1，则不通过
    if ((want < 1 && want !== -1) || isNaN(want)) {
      // 比 1 小的数里，只允许 -1 , 0 也不行
      throw this.getWantPageError()
    }

    if (want >= 1) {
      log.warning(crawlPartTip.replace('{}', want.toString()))
    } else if (want === -1) {
      log.warning(crawlAllTip)
    }

    return want
  }

  // 在某些页面检查页数/个数设置，要求必须大于 0
  // 参数 max 为最大值
  // 参数 page 指示单位是“页”（页面）还是“个”（作品个数）
  protected checkWantPageInputGreater0(max: number, page: boolean) {
    const want = settings.wantPageArr[pageType.type]
    if (want > 0) {
      const result = want > max ? max : want

      if (page) {
        log.warning(lang.transl('_从本页开始下载x页', result.toString()))
      } else {
        log.warning(lang.transl('_从本页开始下载x个', result.toString()))
      }
      return result
    } else {
      throw this.getWantPageError()
    }
  }

  // 设置要获取的作品数或页数。有些页面使用，有些页面不使用。使用时再具体定义
  protected getWantPage() {}

  // 获取多图作品设置。因为这个不属于过滤器 filter，所以在这里直接获取
  protected getMultipleSetting() {
    // 获取作品张数设置
    if (settings.firstFewImagesSwitch) {
      log.warning(
        lang.transl('_多图作品只下载前几张图片') + settings.firstFewImages
      )
    }
  }

  // 准备正常进行抓取，执行一些检查
  protected async readyCrawl() {
    // 检查是否可以开始抓取
    if (states.busy) {
      toast.error(lang.transl('_当前任务尚未完成'))
      return
    }

    log.clear()

    log.success(lang.transl('_任务开始0'))

    if (Utils.isPixiv()) {
      await mute.getMuteSettings()
    }

    this.getWantPage()

    this.getMultipleSetting()

    this.finishedRequest = 0

    this.crawlStopped = false

    EVT.fire('crawlStart')

    // 进入第一个抓取流程
    this.nextStep()
  }

  // 基于传递的 id 列表直接开始抓取
  // 这个方法是为了让其他模块可以传递 id 列表，直接进行下载。
  // 这个类的子类没有必要使用这个方法。当子类想要直接指定 id 列表时，修改自己的 getIdList 方法即可。
  protected async crawlIdList(idList: IDData[]) {
    // 检查是否可以开始抓取
    if (states.busy) {
      toast.error(lang.transl('_当前任务尚未完成'))
      return
    }

    log.clear()

    log.success(lang.transl('_任务开始0'))

    if (Utils.isPixiv()) {
      await mute.getMuteSettings()
    }

    this.getMultipleSetting()

    this.finishedRequest = 0

    this.crawlStopped = false

    EVT.fire('crawlStart')

    store.idList = idList

    this.getIdListFinished()
  }

  // 当可以开始抓取时，进入下一个流程。默认情况下，开始获取作品列表。如有不同，由子类具体定义
  protected nextStep() {
    this.getIdList()
  }

  // 获取 id 列表，由各个子类具体定义
  protected getIdList() {}

  // id 列表获取完毕，开始抓取作品内容页
  protected getIdListFinished() {
    this.resetGetIdListStatus()

    EVT.fire('getIdListFinished')
    if (states.bookmarkMode) {
      return
    }

    if (store.idList.length === 0) {
      return this.noResult()
    }

    log.log(lang.transl('_当前作品个数', store.idList.length.toString()))

    // 这个 return 在这里重置任务状态，不继续抓取作品的详情了，用于调试时反复进行抓取
    // return states.allWork = false

    log.log(lang.transl('_开始获取作品信息'))

    if (store.idList.length <= this.ajaxThreadsDefault) {
      this.ajaxThread = store.idList.length
    } else {
      this.ajaxThread = this.ajaxThreadsDefault
    }

    for (let i = 0; i < this.ajaxThread; i++) {
      this.getWorksData()
    }
  }

  // 重设抓取作品列表时使用的变量或标记
  protected resetGetIdListStatus() {}

  // 获取作品的数据
  protected async getWorksData(idData?: IDData) {
    idData = idData || (store.idList.shift()! as IDData)
    const id = idData.id

    if (!id) {
      const msg = 'Error: work id is invalid!'
      msgBox.error(msg)
      throw new Error(msg)
    }

    try {
      if (idData.type === 'novels') {
        const data = await API.getNovelData(id)
        await saveNovelData.save(data)
        this.afterGetWorksData(data)
      } else {
        const data = await API.getArtworkData(id)
        await saveArtworkData.save(data)
        this.afterGetWorksData(data)
      }
    } catch (error) {
      if (error.status) {
        // 请求成功，但状态码不正常，不再重试
        this.logErrorStatus(error.status, id)
        this.afterGetWorksData()
      } else {
        // 请求失败，没有获得服务器的返回数据，一般都是
        // TypeError: Failed to fetch
        // 此外这里也会捕获到 save 作品数据时的错误（如果有）
        console.error(error)

        // 再次发送这个请求
        setTimeout(() => {
          this.getWorksData(idData)
        }, 2000)
      }
    }
  }

  // 每当获取完一个作品的信息
  private async afterGetWorksData(data?: NovelData | ArtworkData) {
    // 抓取可能中途停止，在停止之后完成的抓取不进行任何处理
    if (this.crawlStopped) {
      return
    }

    this.logResultTotal()

    // 如果会员搜索优化策略指示停止抓取，则立即进入完成状态
    if (data && (await vipSearchOptimize.stopCrawl(data, this.ajaxThread))) {
      // 指示抓取已停止
      this.crawlStopped = true
      this.crawlFinished()
    }

    if (store.idList.length > 0) {
      // 如果存在下一个作品，则
      this.getWorksData()
    } else {
      // 没有剩余作品，统计此后有多少个完成的请求
      this.finishedRequest++
      // 所有请求都执行完毕
      if (this.finishedRequest === this.ajaxThread) {
        this.crawlFinished()
      }
    }
  }

  // 抓取完毕
  protected crawlFinished() {
    if (store.result.length === 0) {
      return this.noResult()
    }

    store.crawlCompleteTime = new Date()

    this.sortResult()

    if (settings.downloadUgoiraFirst) {
      store.resultMeta.sort(Tools.sortUgoiraFirst)
      store.result.sort(Tools.sortUgoiraFirst)
    }

    log.log(lang.transl('_共抓取到n个作品', store.resultMeta.length.toString()))

    log.log(lang.transl('_共抓取到n个文件', store.result.length.toString()))

    log.success(lang.transl('_抓取完毕'), 2)

    // 发出抓取完毕的信号
    EVT.fire('crawlFinish')
  }

  // 网络请求状态异常时输出提示
  private logErrorStatus(status: number, id: string) {
    switch (status) {
      case 0:
        log.error(id + ': ' + lang.transl('_作品页状态码0'))
        break

      case 400:
        log.error(id + ': ' + lang.transl('_作品页状态码400'))
        break

      case 403:
        log.error(id + ': ' + lang.transl('_作品页状态码403'))
        break

      case 404:
        log.error(id + ': ' + lang.transl('_作品页状态码404'))
        break

      default:
        log.error(lang.transl('_无权访问', id))
        break
    }
  }

  // 每当抓取了一个作品之后，输出提示
  protected logResultTotal() {
    log.log(
      `${lang.transl('_待处理')} ${store.idList.length}, ${lang.transl(
        '_共抓取到n个作品',
        store.resultMeta.length.toString()
      )}`,
      1,
      false
    )
  }

  // 抓取结果为 0 时输出提示
  protected noResult() {
    // 先触发 crawlFinish，后触发 crawlEmpty。这样便于其他组件处理 crawlEmpty 这个例外情况
    // 如果触发顺序反过来，那么最后执行的都是 crawlFinish，可能会覆盖对 crawlEmpty 的处理
    EVT.fire('crawlFinish')
    EVT.fire('crawlEmpty')
    const msg = lang.transl('_抓取结果为零')
    log.error(msg, 2)
    msgBox.error(msg)
  }

  // 抓取完成后，对结果进行排序
  protected sortResult() {}
}

export { InitPageBase }
