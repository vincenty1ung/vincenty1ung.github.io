<p align="center">
  <a href="https://github.com/vincent">
   <img alt="Uncle-Yeong-Logo" src="./web/img/logo1.jpg">
  </a>
</p>

<p align="center">
  为简化开发工作、提高生产率而生
</p>

<p align="center">
  
  <a href="https://github.com/996icu/996.ICU/blob/master/LICENSE">
    <img alt="996icu" src="https://img.shields.io/badge/license-NPL%20(The%20996%20Prohibited%20License)-blue.svg">
  </a>

  <a href="https://www.apache.org/licenses/LICENSE-2.0">
    <img alt="code style" src="https://img.shields.io/badge/license-Apache%202-4EB1BA.svg?style=flat-square">
  </a>
</p>

# vincent's Repo For Cydia

> - Source: https://github.com/vincent/vincent.github.io/
> - Twitter: https://twitter.com/uncle_ch1n
> - Tumblr: https://www.tumblr.com/blog/unclech1n

### 前情提要 test

- [ ] 自动编译 deb 并打包
- [ ] 自动维护 deb 详情页
- [x] deb 打包生成(cydia/builddebs/packages.sh)
- [x] index 页面可控(index.html)
- [x] 只编译 Packages/Packages.gz/Packages.bz2(cydia/push.sh)
- [x] 编译打包 Packages/Packages.gz/Packages.bz2(cydia/update.sh)
- [x] 删除 Packages/Packages.gz/Packages.bz2(cydia/delete.sh)

```python
#path:cydia/package.sh
#!/bin/bash
#dpkg-deb -bZgzip projects/system/repoicons debs
#dpkg-deb -e 14991128_CallAssist_1.6.7_Cracked.deb tmp/DEBIAN
#dpkg-deb -x 14991128_CallAssist_1.6.7_Cracked.deb tmp(普通解压)
#chmod -R 0755 DEBIAN
#dpkg-deb -b tmp/ com.uncleyeung.kuaidial.deb(打包)
# sudo   find ./ -name ".DS_Store" -depth -exec rm {} \;
#1，禁止.DS_store生成：
#重启Mac即可生效。
#defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool TRUE
#2，恢复.DS_store生成：
#defaults delete com.apple.desktopservices DSDontWriteNetworkStores
```

```python
#path:cydia/clean.sh
#!/bin/bash
#find ./debs -type f -name '*.deb' -delete
#rm -r Packages.bz2
#rm -r Packages
#rm -r Packages.gz
```

```python
#path:cydia/install.sh
#!/bin/bash
#dpkg-scanpackages ./debs /dev/null > Packages
#bzip2 -fks Packages
#dpkg-scanpackages debs /dev/null > Packages
#tar zcvf Packages.gz Packages
#bzip2 -k Packages Packages.bz2
```

```python
#path:cydia/install.sh
#!/bin/bash
#sudo chmod -R 777 /Users/vincent/Desktop/github/xiaomai/cydia
#sudo chmod +x /Users/vincent/Desktop/github/xiaomai/cydia
#./clean.sh
#./package.sh
#./install.sh
```

# 后记 :人人都可 cydia--授之以鱼不如授之以渔

> - 多年前的一个傍晚，一个叫亨利的青年，站在河边发呆。这天是他 30 岁生日，可他不知道自己是否还有活下去的勇气。
> - 因为亨利从小在福利院长大，身材矮小，长相也不漂亮，讲话又带着浓重的乡土口音，所以一直自卑，连最普通的工作都不敢去应聘，没有工作也没有家。
> - 就在亨利徘徊于生死之间的时候，他的好友约翰兴冲冲地跑过来对他说：“亨利，告诉你一个好消息！我刚从收音机里听到一则消息，拿破仑曾经丢失了一个孙子。
> - 播音员描述的特征，与你毫不相差！”“真的吗？我竟然是拿破仑的孙子！“亨利一下子精神大振，联想到爷爷曾经以矮小的身材指挥着千军万马，
> - 用带着泥土芳香的法语发出威严的命令，他顿感自己矮小的凶狠才同样充满力量，讲话时的法国口音也带着几分高贵和威严。
> - 就这样，凭着他是拿破仑的孙子这一“美丽的谎言”，凭着他要成为拿破仑的强烈欲望，30 年后，他竟然成了一家大公司的总裁。
> - 后来，他请人查证了自己并非拿破仑的孙子，但这早已不重要了。
> - “授人以鱼，不如授人以渔；授人以渔，不如授人以欲。”　就是指没有直接给予物质，而是教以方法或某种信念
> - 原文：Give a man a fish and you feed him for a day. Teach a man to fish and you feed him for a lifetime
> - 教育，其实也是一样的道理。一个好的称职的教师,不但要给学生以知识,还要教会学生自学的方法.
> - 联合国教科文组织曾谈到:今后的文盲将不再是不识字的人,而是不会自学和学了知识不会应用的人。

作者 [@vincent]
<br>2019 年 03 月 13 日

```flow
st=>start: Start
op=>operation: Your Operation
cond=>condition: 做 or 不做?
e=>end

st->op->cond
cond(做)->e
cond(不做)->op
```
