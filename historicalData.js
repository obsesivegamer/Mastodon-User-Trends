const historicalData = [
  {
    "date": "2022-09-30",
    "total": 3605039,
    "active": 470403
  },
  {
    "date": "2022-10-01",
    "total": 3605684,
    "active": 470799
  },
  {
    "date": "2022-10-02",
    "total": 3607107,
    "active": 470914
  },
  {
    "date": "2022-10-03",
    "total": 3608231,
    "active": 397138
  },
  {
    "date": "2022-10-04",
    "total": 3609492,
    "active": 397392
  },
  {
    "date": "2022-10-05",
    "total": 3583802,
    "active": 400650,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2022-10-06",
    "total": 3558111,
    "active": 403908,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2022-10-07",
    "total": 3607938,
    "active": 405108
  },
  {
    "date": "2022-10-08",
    "total": 3608413,
    "active": 406435
  },
  {
    "date": "2022-10-09",
    "total": 3606890,
    "active": 406757
  },
  {
    "date": "2022-10-10",
    "total": 3609407,
    "active": 360412
  },
  {
    "date": "2022-10-11",
    "total": 3611764,
    "active": 362067
  },
  {
    "date": "2022-10-12",
    "total": 3616698,
    "active": 364588
  },
  {
    "date": "2022-10-13",
    "total": 3618085,
    "active": 365401
  },
  {
    "date": "2022-10-14",
    "total": 3572286,
    "active": 367020
  },
  {
    "date": "2022-10-15",
    "total": 3573878,
    "active": 368486
  },
  {
    "date": "2022-10-16",
    "total": 3575381,
    "active": 368290
  },
  {
    "date": "2022-10-17",
    "total": 3575376,
    "active": 356682
  },
  {
    "date": "2022-10-18",
    "total": 3576825,
    "active": 356818
  },
  {
    "date": "2022-10-19",
    "total": 3578645,
    "active": 358009
  },
  {
    "date": "2022-10-20",
    "total": 3580505,
    "active": 359022
  },
  {
    "date": "2022-10-21",
    "total": 3582208,
    "active": 359882
  },
  {
    "date": "2022-10-22",
    "total": 3584600,
    "active": 361864
  },
  {
    "date": "2022-10-23",
    "total": 3586608,
    "active": 366395
  },
  {
    "date": "2022-10-24",
    "total": 3589552,
    "active": 360244
  },
  {
    "date": "2022-10-25",
    "total": 3591245,
    "active": 361397
  },
  {
    "date": "2022-10-26",
    "total": 3594472,
    "active": 364871
  },
  {
    "date": "2022-10-27",
    "total": 3598722,
    "active": 370360
  },
  {
    "date": "2022-10-28",
    "total": 3606754,
    "active": 381167
  },
  {
    "date": "2022-10-29",
    "total": 3656265,
    "active": 452016
  },
  {
    "date": "2022-10-30",
    "total": 3690437,
    "active": 496010
  },
  {
    "date": "2022-10-31",
    "total": 3723223,
    "active": 528916
  },
  {
    "date": "2022-11-01",
    "total": 3761979,
    "active": 572392
  },
  {
    "date": "2022-11-02",
    "total": 3798152,
    "active": 608837
  },
  {
    "date": "2022-11-03",
    "total": 3833368,
    "active": 655376
  },
  {
    "date": "2022-11-04",
    "total": 3812125,
    "active": 683363
  },
  {
    "date": "2022-11-05",
    "total": 3870983,
    "active": 740722
  },
  {
    "date": "2022-11-06",
    "total": 3970007,
    "active": 863096
  },
  {
    "date": "2022-11-07",
    "total": 4105507,
    "active": 1044405
  },
  {
    "date": "2022-11-08",
    "total": 4239565,
    "active": 1194896
  },
  {
    "date": "2022-11-09",
    "total": 4367254,
    "active": 1325550
  },
  {
    "date": "2022-11-10",
    "total": 4455121,
    "active": 1460507
  },
  {
    "date": "2022-11-11",
    "total": 4530762,
    "active": 1543628
  },
  {
    "date": "2022-11-12",
    "total": 4613240,
    "active": 1638202
  },
  {
    "date": "2022-11-13",
    "total": 4681940,
    "active": 1719592
  },
  {
    "date": "2022-11-14",
    "total": 4747221,
    "active": 1785710
  },
  {
    "date": "2022-11-15",
    "total": 4794235,
    "active": 1835815
  },
  {
    "date": "2022-11-16",
    "total": 4842593,
    "active": 1850396
  },
  {
    "date": "2022-11-17",
    "total": 4881134,
    "active": 1920151
  },
  {
    "date": "2022-11-18",
    "total": 4938856,
    "active": 1958366
  },
  {
    "date": "2022-11-19",
    "total": 4932736,
    "active": 2223817
  },
  {
    "date": "2022-11-20",
    "total": 5045034,
    "active": 2321529
  },
  {
    "date": "2022-11-21",
    "total": 5144773,
    "active": 2446507
  },
  {
    "date": "2022-11-22",
    "total": 5206070,
    "active": 2475160
  },
  {
    "date": "2022-11-23",
    "total": 5249225,
    "active": 2527469
  },
  {
    "date": "2022-11-24",
    "total": 5282884,
    "active": 2565903
  },
  {
    "date": "2022-11-25",
    "total": 5295488,
    "active": 2572087
  },
  {
    "date": "2022-11-26",
    "total": 5316651,
    "active": 2592483
  },
  {
    "date": "2022-11-27",
    "total": 5332392,
    "active": 2603092
  },
  {
    "date": "2022-11-28",
    "total": 5354048,
    "active": 2584189
  },
  {
    "date": "2022-11-29",
    "total": 5369945,
    "active": 2608527
  },
  {
    "date": "2022-11-30",
    "total": 5387503,
    "active": 2624121
  },
  {
    "date": "2022-12-01",
    "total": 5401399,
    "active": 2617550,
    "servers": 8451
  },
  {
    "date": "2022-12-02",
    "total": 5387146,
    "active": 2527166,
    "servers": 8401
  },
  {
    "date": "2022-12-03",
    "total": 5404186,
    "active": 2536166,
    "servers": 8666
  },
  {
    "date": "2022-12-04",
    "total": 5412393,
    "active": 2524632,
    "servers": 8606
  },
  {
    "date": "2022-12-05",
    "total": 5421536,
    "active": 2478291,
    "servers": 8751
  },
  {
    "date": "2022-12-06",
    "total": 5423031,
    "active": 2424002,
    "servers": 8678
  },
  {
    "date": "2022-12-09",
    "total": 5446000,
    "active": 2278703,
    "servers": 8633
  },
  {
    "date": "2022-12-10",
    "total": 5459676,
    "active": 2244654,
    "servers": 8601
  },
  {
    "date": "2022-12-11",
    "total": 5465362,
    "active": 2222843,
    "servers": 8831
  },
  {
    "date": "2022-12-12",
    "total": 5474864,
    "active": 2163975,
    "servers": 8805
  },
  {
    "date": "2022-12-13",
    "total": 5489594,
    "active": 2156463,
    "servers": 8832
  },
  {
    "date": "2022-12-14",
    "total": 5499419,
    "active": 2131380,
    "servers": 8823
  },
  {
    "date": "2022-12-15",
    "total": 5513782,
    "active": 2085437,
    "servers": 8774
  },
  {
    "date": "2022-12-16",
    "total": 5522707,
    "active": 2081843,
    "servers": 8781
  },
  {
    "date": "2022-12-17",
    "total": 5614698,
    "active": 2009012,
    "servers": 8749
  },
  {
    "date": "2022-12-18",
    "total": 5651256,
    "active": 1976928,
    "servers": 9112
  },
  {
    "date": "2022-12-19",
    "total": 5677157,
    "active": 1937158,
    "servers": 9101
  },
  {
    "date": "2022-12-20",
    "total": 5719462,
    "active": 1944730,
    "servers": 9060
  },
  {
    "date": "2022-12-21",
    "total": 5742625,
    "active": 1925944,
    "servers": 9030
  },
  {
    "date": "2022-12-22",
    "total": 5765503,
    "active": 1922977,
    "servers": 9513
  },
  {
    "date": "2022-12-23",
    "total": 5777251,
    "active": 1913432,
    "servers": 9469
  },
  {
    "date": "2022-12-24",
    "total": 5788763,
    "active": 1904004,
    "servers": 9599
  },
  {
    "date": "2022-12-25",
    "total": 5796234,
    "active": 1891191,
    "servers": 9573
  },
  {
    "date": "2022-12-26",
    "total": 5805685,
    "active": 1860760,
    "servers": 9635
  },
  {
    "date": "2022-12-27",
    "total": 5810920,
    "active": 1843906,
    "servers": 9602
  },
  {
    "date": "2022-12-28",
    "total": 5817860,
    "active": 1831291,
    "servers": 9561
  },
  {
    "date": "2022-12-29",
    "total": 5829411,
    "active": 1823027,
    "servers": 9517
  },
  {
    "date": "2022-12-30",
    "total": 5838743,
    "active": 1819260,
    "servers": 9706
  },
  {
    "date": "2022-12-31",
    "total": 5844024,
    "active": 1820710,
    "servers": 9686
  },
  {
    "date": "2023-01-01",
    "total": 5875129,
    "active": 1816417,
    "servers": 9743
  },
  {
    "date": "2023-01-02",
    "total": 5883342,
    "active": 1813291,
    "servers": 9743
  },
  {
    "date": "2023-01-03",
    "total": 5894174,
    "active": 1796032,
    "servers": 9778
  },
  {
    "date": "2023-01-04",
    "total": 5899981,
    "active": 1795423,
    "servers": 9767
  },
  {
    "date": "2023-01-05",
    "total": 5907345,
    "active": 1791619
  },
  {
    "date": "2023-01-06",
    "total": 5913832,
    "active": 1787112
  },
  {
    "date": "2023-01-07",
    "total": 5919524,
    "active": 1783256
  },
  {
    "date": "2023-01-08",
    "total": 5923302,
    "active": 1779947
  },
  {
    "date": "2023-01-09",
    "total": 5927419,
    "active": 1761350
  },
  {
    "date": "2023-01-10",
    "total": 5931881,
    "active": 1758147
  },
  {
    "date": "2023-01-11",
    "total": 5934418,
    "active": 1742135
  },
  {
    "date": "2023-01-12",
    "total": 5940037,
    "active": 1731995
  },
  {
    "date": "2023-01-13",
    "total": 5956074,
    "active": 1728681
  },
  {
    "date": "2023-01-14",
    "total": 5961575,
    "active": 1664881
  },
  {
    "date": "2023-01-15",
    "total": 6261109,
    "active": 1705918,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-01-16",
    "total": 6265924,
    "active": 1644476,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-01-17",
    "total": 6271827,
    "active": 1616640,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-01-18",
    "total": 6277087,
    "active": 1568309,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-01-19",
    "total": 6289037,
    "active": 1552538,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-01-20",
    "total": 5998967,
    "active": 1470842
  },
  {
    "date": "2023-01-21",
    "total": 6006576,
    "active": 1463988
  },
  {
    "date": "2023-01-22",
    "total": 6008298,
    "active": 1455339
  },
  {
    "date": "2023-01-23",
    "total": 6013281,
    "active": 1437246
  },
  {
    "date": "2023-01-24",
    "total": 6017874,
    "active": 1427829
  },
  {
    "date": "2023-01-25",
    "total": 6025810,
    "active": 1423089
  },
  {
    "date": "2023-01-26",
    "total": 6330640,
    "active": 1488638,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-01-27",
    "total": 6337333,
    "active": 1480845
  },
  {
    "date": "2023-01-28",
    "total": 6342971,
    "active": 1472931
  },
  {
    "date": "2023-01-29",
    "total": 6347205,
    "active": 1466547
  },
  {
    "date": "2023-01-30",
    "total": 6351327,
    "active": 1443580
  },
  {
    "date": "2023-01-31",
    "total": 6356139,
    "active": 1431727
  },
  {
    "date": "2023-02-01",
    "total": 6359836,
    "active": 1420508
  },
  {
    "date": "2023-02-02",
    "total": 6363801,
    "active": 1410878
  },
  {
    "date": "2023-02-03",
    "total": 6373994,
    "active": 1413737
  },
  {
    "date": "2023-02-04",
    "total": 6394614,
    "active": 1425631
  },
  {
    "date": "2023-02-05",
    "total": 6400336,
    "active": 1410538
  },
  {
    "date": "2023-02-06",
    "total": 6404504,
    "active": 1404790
  },
  {
    "date": "2023-02-07",
    "total": 6405695,
    "active": 1371606
  },
  {
    "date": "2023-02-08",
    "total": 6415146,
    "active": 1373683
  },
  {
    "date": "2023-02-09",
    "total": 6423774,
    "active": 1379355
  },
  {
    "date": "2023-02-10",
    "total": 6436066,
    "active": 1356978
  },
  {
    "date": "2023-02-11",
    "total": 6442865,
    "active": 1366646
  },
  {
    "date": "2023-02-12",
    "total": 6449538,
    "active": 1368073
  },
  {
    "date": "2023-02-13",
    "total": 6456702,
    "active": 1366261
  },
  {
    "date": "2023-02-14",
    "total": 6460375,
    "active": 1369841
  },
  {
    "date": "2023-02-15",
    "total": 6464758,
    "active": 1369968
  },
  {
    "date": "2023-02-16",
    "total": 6471070,
    "active": 1366993
  },
  {
    "date": "2023-02-17",
    "total": 6474520,
    "active": 1365222
  },
  {
    "date": "2023-02-18",
    "total": 6458723,
    "active": 1357687
  },
  {
    "date": "2023-02-19",
    "total": 6483257,
    "active": 1361415
  },
  {
    "date": "2023-02-20",
    "total": 6490211,
    "active": 1358971
  },
  {
    "date": "2023-02-21",
    "total": 6492165,
    "active": 1352606
  },
  {
    "date": "2023-02-22",
    "total": 6494057,
    "active": 1347228
  },
  {
    "date": "2023-02-23",
    "total": 6499155,
    "active": 1333760
  },
  {
    "date": "2023-02-24",
    "total": 6506047,
    "active": 1332169
  },
  {
    "date": "2023-02-25",
    "total": 6510505,
    "active": 1331688
  },
  {
    "date": "2023-02-26",
    "total": 6511198,
    "active": 1331383
  },
  {
    "date": "2023-02-27",
    "total": 6490683,
    "active": 1327216
  },
  {
    "date": "2023-02-28",
    "total": 6497314,
    "active": 1322928
  },
  {
    "date": "2023-03-01",
    "total": 6483884,
    "active": 1325187
  },
  {
    "date": "2023-03-02",
    "total": 6491613,
    "active": 1321815
  },
  {
    "date": "2023-03-03",
    "total": 6495270,
    "active": 1319437
  },
  {
    "date": "2023-03-04",
    "total": 6504089,
    "active": 1311154
  },
  {
    "date": "2023-03-05",
    "total": 6478044,
    "active": 1305033
  },
  {
    "date": "2023-03-06",
    "total": 6478864,
    "active": 1294800
  },
  {
    "date": "2023-03-07",
    "total": 6484172,
    "active": 1294368
  },
  {
    "date": "2023-03-08",
    "total": 6487855,
    "active": 1293325
  },
  {
    "date": "2023-03-09",
    "total": 6487774,
    "active": 1286240
  },
  {
    "date": "2023-03-10",
    "total": 6495628,
    "active": 1275466
  },
  {
    "date": "2023-03-11",
    "total": 6500917,
    "active": 1271114
  },
  {
    "date": "2023-03-12",
    "total": 6503642,
    "active": 1265932
  },
  {
    "date": "2023-03-13",
    "total": 6507241,
    "active": 1250206
  },
  {
    "date": "2023-03-14",
    "total": 6510193,
    "active": 1248517
  },
  {
    "date": "2023-03-15",
    "total": 6515017,
    "active": 1247487
  },
  {
    "date": "2023-03-16",
    "total": 6519843,
    "active": 1246292
  },
  {
    "date": "2023-03-17",
    "total": 6522722,
    "active": 1243302
  },
  {
    "date": "2023-03-18",
    "total": 6519413,
    "active": 1237860
  },
  {
    "date": "2023-03-19",
    "total": 6515276,
    "active": 1232365
  },
  {
    "date": "2023-03-20",
    "total": 6528055,
    "active": 1219261
  },
  {
    "date": "2023-03-21",
    "total": 6532906,
    "active": 1217731
  },
  {
    "date": "2023-03-22",
    "total": 6534112,
    "active": 1216396
  },
  {
    "date": "2023-03-23",
    "total": 6537218,
    "active": 1212809
  },
  {
    "date": "2023-03-24",
    "total": 6540377,
    "active": 1208317
  },
  {
    "date": "2023-03-25",
    "total": 6543803,
    "active": 1204827
  },
  {
    "date": "2023-03-26",
    "total": 6543927,
    "active": 1199270
  },
  {
    "date": "2023-03-27",
    "total": 6547471,
    "active": 1182000
  },
  {
    "date": "2023-03-28",
    "total": 6551513,
    "active": 1177493
  },
  {
    "date": "2023-03-29",
    "total": 6558758,
    "active": 1180692
  },
  {
    "date": "2023-03-30",
    "total": 6563500,
    "active": 1177878
  },
  {
    "date": "2023-03-31",
    "total": 6567383,
    "active": 1174657
  },
  {
    "date": "2023-04-01",
    "total": 6570824,
    "active": 1173293
  },
  {
    "date": "2023-04-02",
    "total": 6571718,
    "active": 1170691
  },
  {
    "date": "2023-04-03",
    "total": 6576402,
    "active": 1159077
  },
  {
    "date": "2023-04-04",
    "total": 6580720,
    "active": 1157392,
    "servers": 9758
  },
  {
    "date": "2023-04-05",
    "total": 6587032,
    "active": 1158242,
    "servers": 9719
  },
  {
    "date": "2023-04-06",
    "total": 6593370,
    "active": 1161473,
    "servers": 9682
  },
  {
    "date": "2023-04-07",
    "total": 6597758,
    "active": 1188797,
    "servers": 9665
  },
  {
    "date": "2023-04-08",
    "total": 6605736,
    "active": 1195702,
    "servers": 9645
  },
  {
    "date": "2023-04-09",
    "total": 6611629,
    "active": 1196528,
    "servers": 9628
  },
  {
    "date": "2023-04-10",
    "total": 6620135,
    "active": 1192014,
    "servers": 9619
  },
  {
    "date": "2023-04-11",
    "total": 6625660,
    "active": 1195264,
    "servers": 9596
  },
  {
    "date": "2023-04-12",
    "total": 6631919,
    "active": 1198625,
    "servers": 9573
  },
  {
    "date": "2023-04-13",
    "total": 6638506,
    "active": 1202791,
    "servers": 9555
  },
  {
    "date": "2023-04-14",
    "total": 6635264,
    "active": 1196003,
    "servers": 9544
  },
  {
    "date": "2023-04-15",
    "total": 6641082,
    "active": 1201004,
    "servers": 9509
  },
  {
    "date": "2023-04-16",
    "total": 6642782,
    "active": 1204341,
    "servers": 9481
  },
  {
    "date": "2023-04-17",
    "total": 6651031,
    "active": 1198114,
    "servers": 9474
  },
  {
    "date": "2023-04-18",
    "total": 6656819,
    "active": 1199268,
    "servers": 9457
  },
  {
    "date": "2023-04-19",
    "total": 6651384,
    "active": 1204633,
    "servers": 9589
  },
  {
    "date": "2023-04-20",
    "total": 6665646,
    "active": 1210115,
    "servers": 9558
  },
  {
    "date": "2023-04-21",
    "total": 6670713,
    "active": 1214010,
    "servers": 9551
  },
  {
    "date": "2023-04-22",
    "total": 6675335,
    "active": 1214744,
    "servers": 9523
  },
  {
    "date": "2023-04-23",
    "total": 6674294,
    "active": 1216191,
    "servers": 9518
  },
  {
    "date": "2023-04-24",
    "total": 6685731,
    "active": 1212163,
    "servers": 9509
  },
  {
    "date": "2023-04-25",
    "total": 6690373,
    "active": 1214955,
    "servers": 9501
  },
  {
    "date": "2023-04-26",
    "total": 6689715,
    "active": 1209546,
    "servers": 9477
  },
  {
    "date": "2023-04-27",
    "total": 6698290,
    "active": 1208963,
    "servers": 9457
  },
  {
    "date": "2023-04-28",
    "total": 6702386,
    "active": 1210003,
    "servers": 9435
  },
  {
    "date": "2023-04-29",
    "total": 6708359,
    "active": 1213535,
    "servers": 9526
  },
  {
    "date": "2023-04-30",
    "total": 6703505,
    "active": 1211821,
    "servers": 9514
  },
  {
    "date": "2023-05-01",
    "total": 6705045,
    "active": 1199951,
    "servers": 9494
  },
  {
    "date": "2023-05-02",
    "total": 6710748,
    "active": 1200292,
    "servers": 9466
  },
  {
    "date": "2023-05-03",
    "total": 6637675,
    "active": 1188797,
    "servers": 9439
  },
  {
    "date": "2023-05-04",
    "total": 6643643,
    "active": 1188785,
    "servers": 9416
  },
  {
    "date": "2023-05-05",
    "total": 6647913,
    "active": 1173685,
    "servers": 9478
  },
  {
    "date": "2023-05-06",
    "total": 6649681,
    "active": 1166783,
    "servers": 9460
  },
  {
    "date": "2023-05-07",
    "total": 6653955,
    "active": 1165452,
    "servers": 9444
  },
  {
    "date": "2023-05-08",
    "total": 6657247,
    "active": 1151278,
    "servers": 9436
  },
  {
    "date": "2023-05-09",
    "total": 6662257,
    "active": 1152003,
    "servers": 9416
  },
  {
    "date": "2023-05-10",
    "total": 6671537,
    "active": 1152082,
    "servers": 9401
  },
  {
    "date": "2023-05-11",
    "total": 6675690,
    "active": 1151852,
    "servers": 9443
  },
  {
    "date": "2023-05-12",
    "total": 6676814,
    "active": 1150089,
    "servers": 9429
  },
  {
    "date": "2023-05-13",
    "total": 6679844,
    "active": 1148990,
    "servers": 9398
  },
  {
    "date": "2023-05-14",
    "total": 6681729,
    "active": 1145479,
    "servers": 9389
  },
  {
    "date": "2023-05-15",
    "total": 6684517,
    "active": 1137691,
    "servers": 9381
  },
  {
    "date": "2023-05-16",
    "total": 6688904,
    "active": 1137803,
    "servers": 9367
  },
  {
    "date": "2023-05-17",
    "total": 6691291,
    "active": 1136900,
    "servers": 9347
  },
  {
    "date": "2023-05-18",
    "total": 6692494,
    "active": 1137673,
    "servers": 9316
  },
  {
    "date": "2023-05-19",
    "total": 6696138,
    "active": 1136021,
    "servers": 9321
  },
  {
    "date": "2023-05-20",
    "total": 6697629,
    "active": 1129626,
    "servers": 9291
  },
  {
    "date": "2023-05-21",
    "total": 6700623,
    "active": 1127057,
    "servers": 9261
  },
  {
    "date": "2023-05-22",
    "total": 6703461,
    "active": 1114821,
    "servers": 9256
  },
  {
    "date": "2023-05-23",
    "total": 6705598,
    "active": 1111851,
    "servers": 9240
  },
  {
    "date": "2023-05-24",
    "total": 6681892,
    "active": 1107172,
    "servers": 9235
  },
  {
    "date": "2023-05-25",
    "total": 6685782,
    "active": 1106715,
    "servers": 9206
  },
  {
    "date": "2023-05-26",
    "total": 6710514,
    "active": 1108361,
    "servers": 9201
  },
  {
    "date": "2023-05-27",
    "total": 6714171,
    "active": 1106700,
    "servers": 9176
  },
  {
    "date": "2023-05-28",
    "total": 6714004,
    "active": 1103920,
    "servers": 9147
  },
  {
    "date": "2023-05-29",
    "total": 6818966,
    "active": 1143766,
    "servers": 9316,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-05-30",
    "total": 6824070,
    "active": 1156218
  },
  {
    "date": "2023-05-31",
    "total": 6843011,
    "active": 1170852
  },
  {
    "date": "2023-06-01",
    "total": 6857971,
    "active": 1181560
  },
  {
    "date": "2023-06-02",
    "total": 6873516,
    "active": 1180826
  },
  {
    "date": "2023-06-03",
    "total": 6884104,
    "active": 1180819
  },
  {
    "date": "2023-06-04",
    "total": 6888468,
    "active": 1179334
  },
  {
    "date": "2023-06-05",
    "total": 6890504,
    "active": 1170309
  },
  {
    "date": "2023-06-06",
    "total": 6892307,
    "active": 1170475
  },
  {
    "date": "2023-06-07",
    "total": 6923470,
    "active": 1166349
  },
  {
    "date": "2023-06-08",
    "total": 6926143,
    "active": 1159615
  },
  {
    "date": "2023-06-09",
    "total": 6933994,
    "active": 1157495
  },
  {
    "date": "2023-06-10",
    "total": 6939670,
    "active": 1158575
  },
  {
    "date": "2023-06-11",
    "total": 6945277,
    "active": 1161727
  },
  {
    "date": "2023-06-12",
    "total": 6949419,
    "active": 1142397
  },
  {
    "date": "2023-06-13",
    "total": 6957564,
    "active": 1148775
  },
  {
    "date": "2023-06-14",
    "total": 6994241,
    "active": 1145398
  },
  {
    "date": "2023-06-15",
    "total": 6999691,
    "active": 1140840
  },
  {
    "date": "2023-06-16",
    "total": 7005100,
    "active": 1141149
  },
  {
    "date": "2023-06-17",
    "total": 6989075,
    "active": 1152419
  },
  {
    "date": "2023-06-18",
    "total": 7009601,
    "active": 1169758
  },
  {
    "date": "2023-06-19",
    "total": 7031215,
    "active": 1177551
  },
  {
    "date": "2023-06-20",
    "total": 7054516,
    "active": 1189420
  },
  {
    "date": "2023-06-21",
    "total": 7073320,
    "active": 1201531
  },
  {
    "date": "2023-06-22",
    "total": 7094749,
    "active": 1217344
  },
  {
    "date": "2023-06-23",
    "total": 7118284,
    "active": 1224985
  },
  {
    "date": "2023-06-24",
    "total": 7139376,
    "active": 1241559
  },
  {
    "date": "2023-06-25",
    "total": 7136816,
    "active": 1255941
  },
  {
    "date": "2023-06-26",
    "total": 7177728,
    "active": 1264103
  },
  {
    "date": "2023-06-27",
    "total": 7199720,
    "active": 1226332
  },
  {
    "date": "2023-06-28",
    "total": 7219070,
    "active": 1242728
  },
  {
    "date": "2023-06-29",
    "total": 7242698,
    "active": 1259740
  },
  {
    "date": "2023-06-30",
    "total": 7264539,
    "active": 1276469
  },
  {
    "date": "2023-07-01",
    "total": 7284590,
    "active": 1298269
  },
  {
    "date": "2023-07-02",
    "total": 7380546,
    "active": 1408994
  },
  {
    "date": "2023-07-03",
    "total": 7478913,
    "active": 1583998
  },
  {
    "date": "2023-07-04",
    "total": 7583192,
    "active": 1675202
  },
  {
    "date": "2023-07-05",
    "total": 7619665,
    "active": 1737787
  },
  {
    "date": "2023-07-06",
    "total": 7602237,
    "active": 1773028
  },
  {
    "date": "2023-07-07",
    "total": 7643506,
    "active": 1826515
  },
  {
    "date": "2023-07-08",
    "total": 7675745,
    "active": 1872951
  },
  {
    "date": "2023-07-09",
    "total": 7679331,
    "active": 1906425
  },
  {
    "date": "2023-07-10",
    "total": 7700576,
    "active": 1930218
  },
  {
    "date": "2023-07-11",
    "total": 7747731,
    "active": 1962715
  },
  {
    "date": "2023-07-12",
    "total": 7771200,
    "active": 1989334
  },
  {
    "date": "2023-07-13",
    "total": 7796975,
    "active": 2018802
  },
  {
    "date": "2023-07-14",
    "total": 7829676,
    "active": 2058427
  },
  {
    "date": "2023-07-15",
    "total": 7848649,
    "active": 2083344
  },
  {
    "date": "2023-07-16",
    "total": 7853017,
    "active": 2094949
  },
  {
    "date": "2023-07-17",
    "total": 7849574,
    "active": 2095048
  },
  {
    "date": "2023-07-18",
    "total": 7857393,
    "active": 2105031
  },
  {
    "date": "2023-07-19",
    "total": 7860720,
    "active": 2109729
  },
  {
    "date": "2023-07-20",
    "total": 7865323,
    "active": 2111539,
    "servers": 8931
  },
  {
    "date": "2023-07-21",
    "total": 7870372,
    "active": 2112504,
    "servers": 8907
  },
  {
    "date": "2023-07-22",
    "total": 7872071,
    "active": 2108027,
    "servers": 8885
  },
  {
    "date": "2023-07-23",
    "total": 7876946,
    "active": 2108264,
    "servers": 8889
  },
  {
    "date": "2023-07-24",
    "total": 7882462,
    "active": 2098725,
    "servers": 8902
  },
  {
    "date": "2023-07-25",
    "total": 7878125,
    "active": 2116455,
    "servers": 8892
  },
  {
    "date": "2023-07-26",
    "total": 7892323,
    "active": 2135632,
    "servers": 8871
  },
  {
    "date": "2023-07-27",
    "total": 7901482,
    "active": 2144420,
    "servers": 8861
  },
  {
    "date": "2023-07-28",
    "total": 7916570,
    "active": 2157702,
    "servers": 9290
  },
  {
    "date": "2023-07-29",
    "total": 7921022,
    "active": 2164968,
    "servers": 9272
  },
  {
    "date": "2023-07-30",
    "total": 7924540,
    "active": 2136812,
    "servers": 9285
  },
  {
    "date": "2023-07-31",
    "total": 7931659,
    "active": 2058942,
    "servers": 9276
  },
  {
    "date": "2023-08-01",
    "total": 7938664,
    "active": 2024780,
    "servers": 9227
  },
  {
    "date": "2023-08-02",
    "total": 7963736,
    "active": 2007200,
    "servers": 9192
  },
  {
    "date": "2023-08-03",
    "total": 7970283,
    "active": 1993011,
    "servers": 9171
  },
  {
    "date": "2023-08-04",
    "total": 7974975,
    "active": 1957666,
    "servers": 9162
  },
  {
    "date": "2023-08-05",
    "total": 7982381,
    "active": 1936843,
    "servers": 9135
  },
  {
    "date": "2023-08-06",
    "total": 7986688,
    "active": 1921914,
    "servers": 9116
  },
  {
    "date": "2023-08-07",
    "total": 7990197,
    "active": 1895207,
    "servers": 9311
  },
  {
    "date": "2023-08-08",
    "total": 7996914,
    "active": 1881225,
    "servers": 9306
  },
  {
    "date": "2023-08-09",
    "total": 8002101,
    "active": 1869982,
    "servers": 9286
  },
  {
    "date": "2023-08-10",
    "total": 8008798,
    "active": 1865631,
    "servers": 9274
  },
  {
    "date": "2023-08-11",
    "total": 8009632,
    "active": 1851045,
    "servers": 9255
  },
  {
    "date": "2023-08-12",
    "total": 8015892,
    "active": 1838253,
    "servers": 9246
  },
  {
    "date": "2023-08-13",
    "total": 8020399,
    "active": 1832354,
    "servers": 9289
  },
  {
    "date": "2023-08-14",
    "total": 8027039,
    "active": 1818809,
    "servers": 9281
  },
  {
    "date": "2023-08-15",
    "total": 8028889,
    "active": 1814400,
    "servers": 9266
  },
  {
    "date": "2023-08-16",
    "total": 8034092,
    "active": 1816124,
    "servers": 9261
  },
  {
    "date": "2023-08-17",
    "total": 8039087,
    "active": 1823339,
    "servers": 9247
  },
  {
    "date": "2023-08-18",
    "total": 8041914,
    "active": 1829316,
    "servers": 9226
  },
  {
    "date": "2023-08-19",
    "total": 8047228,
    "active": 1838854,
    "servers": 9198
  },
  {
    "date": "2023-08-20",
    "total": 8053257,
    "active": 1850610,
    "servers": 9186
  },
  {
    "date": "2023-08-21",
    "total": 8058930,
    "active": 1845569,
    "servers": 9171
  },
  {
    "date": "2023-08-22",
    "total": 8057746,
    "active": 1839598,
    "servers": 9161
  },
  {
    "date": "2023-08-23",
    "total": 8058649,
    "active": 1833097,
    "servers": 9151
  },
  {
    "date": "2023-08-24",
    "total": 8064622,
    "active": 1835768,
    "servers": 9150
  },
  {
    "date": "2023-08-25",
    "total": 8067168,
    "active": 1831638,
    "servers": 9137
  },
  {
    "date": "2023-08-26",
    "total": 8070175,
    "active": 1827662,
    "servers": 9125
  },
  {
    "date": "2023-08-27",
    "total": 8075162,
    "active": 1823419,
    "servers": 9115
  },
  {
    "date": "2023-08-28",
    "total": 8075329,
    "active": 1805641,
    "servers": 9104
  },
  {
    "date": "2023-08-29",
    "total": 8081518,
    "active": 1801509,
    "servers": 9088
  },
  {
    "date": "2023-08-30",
    "total": 8066724,
    "active": 1789784,
    "servers": 9077
  },
  {
    "date": "2023-08-31",
    "total": 8070897,
    "active": 1786127,
    "servers": 9217
  },
  {
    "date": "2023-09-01",
    "total": 8074433,
    "active": 1780831,
    "servers": 9203
  },
  {
    "date": "2023-09-02",
    "total": 8062931,
    "active": 1773131,
    "servers": 9190
  },
  {
    "date": "2023-09-03",
    "total": 8067228,
    "active": 1769000,
    "servers": 9163
  },
  {
    "date": "2023-09-04",
    "total": 8070083,
    "active": 1755151,
    "servers": 9154
  },
  {
    "date": "2023-09-05",
    "total": 8073406,
    "active": 1751098,
    "servers": 9138
  },
  {
    "date": "2023-09-06",
    "total": 8077119,
    "active": 1744468,
    "servers": 9131
  },
  {
    "date": "2023-09-07",
    "total": 8082902,
    "active": 1735535,
    "servers": 9121
  },
  {
    "date": "2023-09-08",
    "total": 8086312,
    "active": 1730939,
    "servers": 9118
  },
  {
    "date": "2023-09-09",
    "total": 8090093,
    "active": 1728435,
    "servers": 9116
  },
  {
    "date": "2023-09-10",
    "total": 8094539,
    "active": 1725955,
    "servers": 9101
  },
  {
    "date": "2023-09-11",
    "total": 8096771,
    "active": 1714281,
    "servers": 9076
  },
  {
    "date": "2023-09-12",
    "total": 8078213,
    "active": 1660453,
    "servers": 9073
  },
  {
    "date": "2023-09-13",
    "total": 8082757,
    "active": 1671311,
    "servers": 9062
  },
  {
    "date": "2023-09-14",
    "total": 8084035,
    "active": 1674396,
    "servers": 9021
  },
  {
    "date": "2023-09-15",
    "total": 8089678,
    "active": 1674879,
    "servers": 9018
  },
  {
    "date": "2023-09-16",
    "total": 8090947,
    "active": 1671429,
    "servers": 8987
  },
  {
    "date": "2023-09-17",
    "total": 8091585,
    "active": 1667202,
    "servers": 8962
  },
  {
    "date": "2023-09-18",
    "total": 8095929,
    "active": 1661844,
    "servers": 8956
  },
  {
    "date": "2023-09-19",
    "total": 8122088,
    "active": 1663991,
    "servers": 8968
  },
  {
    "date": "2023-09-20",
    "total": 8132024,
    "active": 1674668,
    "servers": 8941
  },
  {
    "date": "2023-09-21",
    "total": 8135868,
    "active": 1678806,
    "servers": 9003
  },
  {
    "date": "2023-09-22",
    "total": 8137879,
    "active": 1678069,
    "servers": 8948
  },
  {
    "date": "2023-09-23",
    "total": 8142830,
    "active": 1686625,
    "servers": 8917
  },
  {
    "date": "2023-09-24",
    "total": 8146292,
    "active": 1695889,
    "servers": 8898
  },
  {
    "date": "2023-09-25",
    "total": 8149529,
    "active": 1704087,
    "servers": 8901
  },
  {
    "date": "2023-09-26",
    "total": 8154919,
    "active": 1709974,
    "servers": 8897
  },
  {
    "date": "2023-09-27",
    "total": 8156662,
    "active": 1711030,
    "servers": 8881
  },
  {
    "date": "2023-09-28",
    "total": 8157416,
    "active": 1708464,
    "servers": 8855
  },
  {
    "date": "2023-09-29",
    "total": 8158833,
    "active": 1711350,
    "servers": 8843
  },
  {
    "date": "2023-09-30",
    "total": 8164170,
    "active": 1714616,
    "servers": 8824
  },
  {
    "date": "2023-10-01",
    "total": 8160987,
    "active": 1716704,
    "servers": 8810
  },
  {
    "date": "2023-10-02",
    "total": 8163126,
    "active": 1717625,
    "servers": 8807
  },
  {
    "date": "2023-10-03",
    "total": 6355672,
    "active": 1399654,
    "servers": 8737,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-10-04",
    "total": 6354445,
    "active": 1401310,
    "servers": 8722,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-10-05",
    "total": 6356369,
    "active": 1401981,
    "servers": 8709,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-10-06",
    "total": 6356975,
    "active": 1400084,
    "servers": 8682,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-10-07",
    "total": 6358851,
    "active": 1394350,
    "servers": 8664,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-10-08",
    "total": 8768465,
    "active": 1815766,
    "servers": 10233
  },
  {
    "date": "2023-10-09",
    "total": 8771712,
    "active": 1807333,
    "servers": 10227
  },
  {
    "date": "2023-10-10",
    "total": 8770034,
    "active": 1801655,
    "servers": 10169
  },
  {
    "date": "2023-10-11",
    "total": 8765681,
    "active": 1790960,
    "servers": 10119
  },
  {
    "date": "2023-10-12",
    "total": 8768580,
    "active": 1781615,
    "servers": 10085
  },
  {
    "date": "2023-10-13",
    "total": 8764444,
    "active": 1771823,
    "servers": 10069
  },
  {
    "date": "2023-10-14",
    "total": 8767098,
    "active": 1756901,
    "servers": 10024
  },
  {
    "date": "2023-10-15",
    "total": 8762838,
    "active": 1746458,
    "servers": 10003
  },
  {
    "date": "2023-10-16",
    "total": 7841092,
    "active": 1683802,
    "servers": 9993,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-10-17",
    "total": 8781680,
    "active": 1727802,
    "servers": 10123
  },
  {
    "date": "2023-10-18",
    "total": 8776938,
    "active": 1712305,
    "servers": 10066
  },
  {
    "date": "2023-10-19",
    "total": 8778769,
    "active": 1703956,
    "servers": 10043
  },
  {
    "date": "2023-10-20",
    "total": 8778221,
    "active": 1694863,
    "servers": 10014
  },
  {
    "date": "2023-10-21",
    "total": 8781154,
    "active": 1680833,
    "servers": 9986
  },
  {
    "date": "2023-10-22",
    "total": 8773842,
    "active": 1677506,
    "servers": 9973
  },
  {
    "date": "2023-10-23",
    "total": 8778154,
    "active": 1656736,
    "servers": 9942
  },
  {
    "date": "2023-10-24",
    "total": 8783185,
    "active": 1655333,
    "servers": 9919
  },
  {
    "date": "2023-10-25",
    "total": 8785935,
    "active": 1657576,
    "servers": 9917
  },
  {
    "date": "2023-10-26",
    "total": 8790224,
    "active": 1654979,
    "servers": 9905
  },
  {
    "date": "2023-10-27",
    "total": 8782618,
    "active": 1653948,
    "servers": 9900
  },
  {
    "date": "2023-10-28",
    "total": 8795785,
    "active": 1654997,
    "servers": 9871
  },
  {
    "date": "2023-10-29",
    "total": 8827194,
    "active": 1658490,
    "servers": 9992
  },
  {
    "date": "2023-10-30",
    "total": 8828805,
    "active": 1657131,
    "servers": 9969
  },
  {
    "date": "2023-10-31",
    "total": 8826629,
    "active": 1655157,
    "servers": 9930
  },
  {
    "date": "2023-11-01",
    "total": 8829094,
    "active": 1653180,
    "servers": 9905
  },
  {
    "date": "2023-11-02",
    "total": 8832231,
    "active": 1650500,
    "servers": 9889
  },
  {
    "date": "2023-11-03",
    "total": 8835618,
    "active": 1647796,
    "servers": 9853
  },
  {
    "date": "2023-11-04",
    "total": 8836721,
    "active": 1645108,
    "servers": 9831
  },
  {
    "date": "2023-11-05",
    "total": 8837564,
    "active": 1642521,
    "servers": 9783
  },
  {
    "date": "2023-11-06",
    "total": 8840102,
    "active": 1637975,
    "servers": 9775
  },
  {
    "date": "2023-11-07",
    "total": 8840022,
    "active": 1635294,
    "servers": 9763
  },
  {
    "date": "2023-11-08",
    "total": 8842874,
    "active": 1633033,
    "servers": 9745
  },
  {
    "date": "2023-11-09",
    "total": 8828014,
    "active": 1629518,
    "servers": 9707
  },
  {
    "date": "2023-11-10",
    "total": 8831476,
    "active": 1629394,
    "servers": 9705
  },
  {
    "date": "2023-11-11",
    "total": 8833532,
    "active": 1628609,
    "servers": 9671
  },
  {
    "date": "2023-11-12",
    "total": 8834513,
    "active": 1627835,
    "servers": 9660
  },
  {
    "date": "2023-11-13",
    "total": 8836741,
    "active": 1622660,
    "servers": 9649
  },
  {
    "date": "2023-11-14",
    "total": 8839488,
    "active": 1619140,
    "servers": 9636
  },
  {
    "date": "2023-11-15",
    "total": 8840949,
    "active": 1614879,
    "servers": 9600
  },
  {
    "date": "2023-11-16",
    "total": 7918533,
    "active": 1568238,
    "servers": 9610,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-11-17",
    "total": 7919829,
    "active": 1563614,
    "servers": 9593,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-11-18",
    "total": 7922294,
    "active": 1554309,
    "servers": 9570,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-11-19",
    "total": 7919757,
    "active": 1548153,
    "servers": 9535,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-11-20",
    "total": 7910743,
    "active": 1542602,
    "servers": 9519,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-11-21",
    "total": 7912592,
    "active": 1536400,
    "servers": 9483,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2023-11-22",
    "total": 8894000,
    "active": 1574959,
    "servers": 9668
  },
  {
    "date": "2023-11-23",
    "total": 8839893,
    "active": 1566821,
    "servers": 9638
  },
  {
    "date": "2023-11-24",
    "total": 8785786,
    "active": 1558683,
    "servers": 9590
  },
  {
    "date": "2023-11-25",
    "total": 8747728,
    "active": 1551170,
    "servers": 9558
  },
  {
    "date": "2023-11-26",
    "total": 8739880,
    "active": 1549480,
    "servers": 9547
  },
  {
    "date": "2023-11-27",
    "total": 8740105,
    "active": 1546265,
    "servers": 9530
  },
  {
    "date": "2023-11-28",
    "total": 8753175,
    "active": 1544193,
    "servers": 9510
  },
  {
    "date": "2023-11-29",
    "total": 8756200,
    "active": 1540496,
    "servers": 9470
  },
  {
    "date": "2023-11-30",
    "total": 8757922,
    "active": 1540562,
    "servers": 9646
  },
  {
    "date": "2023-12-01",
    "total": 8758479,
    "active": 1539889,
    "servers": 9626
  },
  {
    "date": "2023-12-02",
    "total": 8748299,
    "active": 1538998,
    "servers": 9762
  },
  {
    "date": "2023-12-03",
    "total": 8751060,
    "active": 1544894,
    "servers": 9753
  },
  {
    "date": "2023-12-04",
    "total": 8732987,
    "active": 1548200,
    "servers": 9751
  },
  {
    "date": "2023-12-05",
    "total": 8734169,
    "active": 1554440,
    "servers": 9744
  },
  {
    "date": "2023-12-06",
    "total": 8736886,
    "active": 1557121,
    "servers": 9706
  },
  {
    "date": "2023-12-07",
    "total": 8737426,
    "active": 1555563,
    "servers": 9703
  },
  {
    "date": "2023-12-08",
    "total": 8738527,
    "active": 1553060
  },
  {
    "date": "2023-12-09",
    "total": 8739673,
    "active": 1551399
  },
  {
    "date": "2023-12-10",
    "total": 8728789,
    "active": 1549522
  },
  {
    "date": "2023-12-11",
    "total": 8732191,
    "active": 1546719
  },
  {
    "date": "2023-12-12",
    "total": 8734509,
    "active": 1546358
  },
  {
    "date": "2023-12-13",
    "total": 8736664,
    "active": 1545072
  },
  {
    "date": "2023-12-14",
    "total": 8739027,
    "active": 1544727
  },
  {
    "date": "2023-12-15",
    "total": 8742992,
    "active": 1545773
  },
  {
    "date": "2023-12-16",
    "total": 8705523,
    "active": 1544347
  },
  {
    "date": "2023-12-17",
    "total": 8668054,
    "active": 1542921
  },
  {
    "date": "2023-12-18",
    "total": 8670435,
    "active": 1543840
  },
  {
    "date": "2023-12-19",
    "total": 8652578,
    "active": 1548102
  },
  {
    "date": "2023-12-20",
    "total": 8685296,
    "active": 1548511
  },
  {
    "date": "2023-12-21",
    "total": 8687831,
    "active": 1549639
  },
  {
    "date": "2023-12-22",
    "total": 8691513,
    "active": 1555361
  },
  {
    "date": "2023-12-23",
    "total": 8690737,
    "active": 1554604
  },
  {
    "date": "2023-12-24",
    "total": 8692941,
    "active": 1552966
  },
  {
    "date": "2023-12-25",
    "total": 8692906,
    "active": 1547741
  },
  {
    "date": "2023-12-26",
    "total": 8693566,
    "active": 1546572
  },
  {
    "date": "2023-12-27",
    "total": 8673064,
    "active": 1543476
  },
  {
    "date": "2023-12-28",
    "total": 8673250,
    "active": 1544617
  },
  {
    "date": "2023-12-29",
    "total": 8671773,
    "active": 1545311
  },
  {
    "date": "2023-12-30",
    "total": 8676293,
    "active": 1542459
  },
  {
    "date": "2023-12-31",
    "total": 8675953,
    "active": 1532984
  },
  {
    "date": "2024-01-01",
    "total": 8674230,
    "active": 1522984
  },
  {
    "date": "2024-01-02",
    "total": 8682347,
    "active": 1515563
  },
  {
    "date": "2024-01-03",
    "total": 8682082,
    "active": 1512042
  },
  {
    "date": "2024-01-04",
    "total": 8704589,
    "active": 1521346
  },
  {
    "date": "2024-01-05",
    "total": 8710423,
    "active": 1525985
  },
  {
    "date": "2024-01-06",
    "total": 8713998,
    "active": 1526720
  },
  {
    "date": "2024-01-07",
    "total": 8715091,
    "active": 1526294
  },
  {
    "date": "2024-01-08",
    "total": 8717554,
    "active": 1525335
  },
  {
    "date": "2024-01-09",
    "total": 8719454,
    "active": 1524883
  },
  {
    "date": "2024-01-10",
    "total": 8714938,
    "active": 1523826
  },
  {
    "date": "2024-01-11",
    "total": 8717462,
    "active": 1523620
  },
  {
    "date": "2024-01-12",
    "total": 8722409,
    "active": 1520920
  },
  {
    "date": "2024-01-13",
    "total": 8722540,
    "active": 1518257
  },
  {
    "date": "2024-01-14",
    "total": 8706370,
    "active": 1510289
  },
  {
    "date": "2024-01-15",
    "total": 8727893,
    "active": 1505334
  },
  {
    "date": "2024-01-16",
    "total": 8726956,
    "active": 1499987
  },
  {
    "date": "2024-01-17",
    "total": 8729531,
    "active": 1496877
  },
  {
    "date": "2024-01-18",
    "total": 8252782,
    "active": 1017963,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2024-01-19",
    "total": 8253375,
    "active": 1018447
  },
  {
    "date": "2024-01-20",
    "total": 8252590,
    "active": 1014608
  },
  {
    "date": "2024-01-21",
    "total": 8254874,
    "active": 1013959
  },
  {
    "date": "2024-01-22",
    "total": 8257564,
    "active": 1012108
  },
  {
    "date": "2024-01-23",
    "total": 8257328,
    "active": 1012084
  },
  {
    "date": "2024-01-24",
    "total": 8259507,
    "active": 1011008
  },
  {
    "date": "2024-01-25",
    "total": 8499007,
    "active": 1035906,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2024-01-26",
    "total": 8505364,
    "active": 1034346
  },
  {
    "date": "2024-01-27",
    "total": 8611384,
    "active": 1037978,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-01-28",
    "total": 8562207,
    "active": 1034623,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-01-29",
    "total": 8513030,
    "active": 1031267
  },
  {
    "date": "2024-01-30",
    "total": 8518328,
    "active": 1028713
  },
  {
    "date": "2024-01-31",
    "total": 8520704,
    "active": 1022028
  },
  {
    "date": "2024-02-01",
    "total": 8622157,
    "active": 1013389
  },
  {
    "date": "2024-02-02",
    "total": 8536765,
    "active": 1011784,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-02-03",
    "total": 8451372,
    "active": 1010179,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-02-04",
    "total": 8365980,
    "active": 1008574,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-02-05",
    "total": 8598007,
    "active": 1007796
  },
  {
    "date": "2024-02-06",
    "total": 8601477,
    "active": 1006782
  },
  {
    "date": "2024-02-07",
    "total": 8604165,
    "active": 1004740
  },
  {
    "date": "2024-02-08",
    "total": 9538194,
    "active": 1043523,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2024-02-09",
    "total": 9540415,
    "active": 1044086,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2024-02-10",
    "total": 9542635,
    "active": 1044649,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2024-02-11",
    "total": 9545046,
    "active": 1045180,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2024-02-12",
    "total": 8512561,
    "active": 1004332,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-02-13",
    "total": 8614136,
    "active": 1003862
  },
  {
    "date": "2024-02-14",
    "total": 8617989,
    "active": 1002788
  },
  {
    "date": "2024-02-15",
    "total": 8620362,
    "active": 999604
  },
  {
    "date": "2024-02-16",
    "total": 8621829,
    "active": 996516
  },
  {
    "date": "2024-02-17",
    "total": 8607382,
    "active": 997388
  },
  {
    "date": "2024-02-18",
    "total": 8592934,
    "active": 998260
  },
  {
    "date": "2024-02-19",
    "total": 8594071,
    "active": 999895
  },
  {
    "date": "2024-02-20",
    "total": 8599635,
    "active": 1007318
  },
  {
    "date": "2024-02-21",
    "total": 8603617,
    "active": 1003642
  },
  {
    "date": "2024-02-22",
    "total": 8607599,
    "active": 999966
  },
  {
    "date": "2024-02-23",
    "total": 8610760,
    "active": 999750
  },
  {
    "date": "2024-02-24",
    "total": 8607844,
    "active": 999829
  },
  {
    "date": "2024-02-25",
    "total": 8612287,
    "active": 999037
  },
  {
    "date": "2024-02-26",
    "total": 8614551,
    "active": 997952
  },
  {
    "date": "2024-02-27",
    "total": 8613123,
    "active": 995687
  },
  {
    "date": "2024-02-28",
    "total": 8606519,
    "active": 991875
  },
  {
    "date": "2024-02-29",
    "total": 8560770,
    "active": 988394,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-01",
    "total": 8515020,
    "active": 984913,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-02",
    "total": 8486879,
    "active": 979565,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-03",
    "total": 8487394,
    "active": 976858,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-04",
    "total": 8584565,
    "active": 978213
  },
  {
    "date": "2024-03-05",
    "total": 8589173,
    "active": 971228,
    "servers": 9686
  },
  {
    "date": "2024-03-06",
    "total": 8590862,
    "active": 975052,
    "servers": 9676
  },
  {
    "date": "2024-03-07",
    "total": 8593365,
    "active": 972095,
    "servers": 9666
  },
  {
    "date": "2024-03-08",
    "total": 8595742,
    "active": 969967,
    "servers": 9656
  },
  {
    "date": "2024-03-09",
    "total": 8571374,
    "active": 967259,
    "servers": 9640,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-10",
    "total": 8536798,
    "active": 965749,
    "servers": 9636,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-11",
    "total": 8502222,
    "active": 964238,
    "servers": 9635,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-12",
    "total": 8504420,
    "active": 963935,
    "servers": 9620,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-13",
    "total": 8506601,
    "active": 962184,
    "servers": 9647,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-14",
    "total": 8608761,
    "active": 963856,
    "servers": 9641
  },
  {
    "date": "2024-03-15",
    "total": 8609227,
    "active": 961515,
    "servers": 9625
  },
  {
    "date": "2024-03-16",
    "total": 8610516,
    "active": 957194,
    "servers": 9616
  },
  {
    "date": "2024-03-17",
    "total": 8612556,
    "active": 952604,
    "servers": 9609
  },
  {
    "date": "2024-03-18",
    "total": 8614700,
    "active": 947504,
    "servers": 9599
  },
  {
    "date": "2024-03-19",
    "total": 8616336,
    "active": 945216,
    "servers": 9598
  },
  {
    "date": "2024-03-20",
    "total": 8613081,
    "active": 942404,
    "servers": 9609
  },
  {
    "date": "2024-03-21",
    "total": 8613935,
    "active": 938533,
    "servers": 9600
  },
  {
    "date": "2024-03-22",
    "total": 8565483,
    "active": 935989,
    "servers": 9597,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-23",
    "total": 8517031,
    "active": 933445,
    "servers": 9583,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-24",
    "total": 8519654,
    "active": 932822,
    "servers": 9576,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-25",
    "total": 8523058,
    "active": 932429,
    "servers": 9717,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-26",
    "total": 8524208,
    "active": 931757,
    "servers": 9707,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-27",
    "total": 8527196,
    "active": 931526,
    "servers": 9699,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-28",
    "total": 8530150,
    "active": 931468,
    "servers": 9693,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-29",
    "total": 8531346,
    "active": 930584,
    "servers": 9680,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-30",
    "total": 8533155,
    "active": 929906,
    "servers": 9664,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-03-31",
    "total": 8536133,
    "active": 930289,
    "servers": 9655,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-01",
    "total": 8526266,
    "active": 929039,
    "servers": 9634,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-02",
    "total": 8527815,
    "active": 928471,
    "servers": 9623,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-03",
    "total": 8529268,
    "active": 927209,
    "servers": 9609,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-04",
    "total": 8532068,
    "active": 926805,
    "servers": 9602,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-05",
    "total": 8534117,
    "active": 926351,
    "servers": 9586,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-06",
    "total": 8537068,
    "active": 925938,
    "servers": 9650,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-07",
    "total": 8538773,
    "active": 925310,
    "servers": 9646,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-08",
    "total": 8540655,
    "active": 923879,
    "servers": 9636,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-09",
    "total": 8541597,
    "active": 923245,
    "servers": 9635,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-04-10",
    "total": 8644752,
    "active": 924063,
    "servers": 9627
  },
  {
    "date": "2024-04-11",
    "total": 8649960,
    "active": 925201,
    "servers": 9623
  },
  {
    "date": "2024-04-12",
    "total": 8653157,
    "active": 925711,
    "servers": 9627
  },
  {
    "date": "2024-04-13",
    "total": 8655503,
    "active": 925339,
    "servers": 9626
  },
  {
    "date": "2024-04-14",
    "total": 8657742,
    "active": 923570,
    "servers": 9613
  },
  {
    "date": "2024-04-15",
    "total": 8657344,
    "active": 921115,
    "servers": 9617
  },
  {
    "date": "2024-04-16",
    "total": 8657770,
    "active": 919304,
    "servers": 9608
  },
  {
    "date": "2024-04-17",
    "total": 8660452,
    "active": 919358,
    "servers": 9598
  },
  {
    "date": "2024-04-18",
    "total": 8662605,
    "active": 919028,
    "servers": 9590
  },
  {
    "date": "2024-04-19",
    "total": 8663097,
    "active": 918167,
    "servers": 9584
  },
  {
    "date": "2024-04-20",
    "total": 8665013,
    "active": 917554,
    "servers": 9606
  },
  {
    "date": "2024-04-21",
    "total": 8667768,
    "active": 916309,
    "servers": 9594
  },
  {
    "date": "2024-04-22",
    "total": 8669275,
    "active": 913349,
    "servers": 9589
  },
  {
    "date": "2024-04-23",
    "total": 8671163,
    "active": 911593,
    "servers": 9583
  },
  {
    "date": "2024-04-24",
    "total": 8667561,
    "active": 910197,
    "servers": 9570
  },
  {
    "date": "2024-04-25",
    "total": 8673155,
    "active": 909645,
    "servers": 9573
  },
  {
    "date": "2024-04-26",
    "total": 8675422,
    "active": 907856,
    "servers": 9547
  },
  {
    "date": "2024-04-27",
    "total": 8681154,
    "active": 910535,
    "servers": 9553
  },
  {
    "date": "2024-04-28",
    "total": 8682657,
    "active": 909543
  },
  {
    "date": "2024-04-29",
    "total": 8684573,
    "active": 907580
  },
  {
    "date": "2024-04-30",
    "total": 8686929,
    "active": 905837
  },
  {
    "date": "2024-05-01",
    "total": 8689016,
    "active": 905243
  },
  {
    "date": "2024-05-02",
    "total": 8691091,
    "active": 904132
  },
  {
    "date": "2024-05-03",
    "total": 8692813,
    "active": 904230
  },
  {
    "date": "2024-05-04",
    "total": 8694406,
    "active": 903601
  },
  {
    "date": "2024-05-05",
    "total": 8697486,
    "active": 899812
  },
  {
    "date": "2024-05-06",
    "total": 8700573,
    "active": 897979
  },
  {
    "date": "2024-05-07",
    "total": 8697687,
    "active": 896702
  },
  {
    "date": "2024-05-08",
    "total": 8648026,
    "active": 893394,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-05-09",
    "total": 8598365,
    "active": 890086,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-05-10",
    "total": 8699172,
    "active": 891805
  },
  {
    "date": "2024-05-11",
    "total": 8692464,
    "active": 890486
  },
  {
    "date": "2024-05-12",
    "total": 8706281,
    "active": 885385
  },
  {
    "date": "2024-05-13",
    "total": 8657971,
    "active": 882108
  },
  {
    "date": "2024-05-14",
    "total": 8609661,
    "active": 878831
  },
  {
    "date": "2024-05-15",
    "total": 8611409,
    "active": 877303
  },
  {
    "date": "2024-05-16",
    "total": 8613923,
    "active": 877056
  },
  {
    "date": "2024-05-17",
    "total": 8615030,
    "active": 875160
  },
  {
    "date": "2024-05-18",
    "total": 8615935,
    "active": 874808
  },
  {
    "date": "2024-05-19",
    "total": 8617358,
    "active": 853769
  },
  {
    "date": "2024-05-20",
    "total": 8618683,
    "active": 857701
  },
  {
    "date": "2024-05-21",
    "total": 8623054,
    "active": 859153
  },
  {
    "date": "2024-05-22",
    "total": 8624576,
    "active": 861146
  },
  {
    "date": "2024-05-23",
    "total": 8626875,
    "active": 862428
  },
  {
    "date": "2024-05-24",
    "total": 8625824,
    "active": 863230
  },
  {
    "date": "2024-05-25",
    "total": 8622525,
    "active": 863380
  },
  {
    "date": "2024-05-26",
    "total": 8624365,
    "active": 864099
  },
  {
    "date": "2024-05-27",
    "total": 8626550,
    "active": 862971
  },
  {
    "date": "2024-05-28",
    "total": 8631523,
    "active": 863245
  },
  {
    "date": "2024-05-29",
    "total": 8633732,
    "active": 862826
  },
  {
    "date": "2024-05-30",
    "total": 8632794,
    "active": 862332
  },
  {
    "date": "2024-05-31",
    "total": 8637588,
    "active": 863539
  },
  {
    "date": "2024-06-01",
    "total": 8638403,
    "active": 863534
  },
  {
    "date": "2024-06-02",
    "total": 8640383,
    "active": 864509
  },
  {
    "date": "2024-06-03",
    "total": 8643140,
    "active": 862577
  },
  {
    "date": "2024-06-04",
    "total": 8645758,
    "active": 863299
  },
  {
    "date": "2024-06-05",
    "total": 8645377,
    "active": 862854
  },
  {
    "date": "2024-06-06",
    "total": 8647057,
    "active": 865232
  },
  {
    "date": "2024-06-07",
    "total": 8648643,
    "active": 866038
  },
  {
    "date": "2024-06-08",
    "total": 8652708,
    "active": 865991
  },
  {
    "date": "2024-06-09",
    "total": 8652337,
    "active": 866161
  },
  {
    "date": "2024-06-10",
    "total": 8654838,
    "active": 865532,
    "servers": 9430
  },
  {
    "date": "2024-06-11",
    "total": 8653929,
    "active": 866904,
    "servers": 9431
  },
  {
    "date": "2024-06-12",
    "total": 8652292,
    "active": 867164,
    "servers": 9420
  },
  {
    "date": "2024-06-13",
    "total": 8654288,
    "active": 868026,
    "servers": 9409
  },
  {
    "date": "2024-06-14",
    "total": 8656431,
    "active": 868147,
    "servers": 9405
  },
  {
    "date": "2024-06-15",
    "total": 8689830,
    "active": 873732,
    "servers": 9393
  },
  {
    "date": "2024-06-16",
    "total": 8693504,
    "active": 873692,
    "servers": 9378
  },
  {
    "date": "2024-06-17",
    "total": 8694945,
    "active": 872815,
    "servers": 9369
  },
  {
    "date": "2024-06-18",
    "total": 8696996,
    "active": 873282,
    "servers": 9371
  },
  {
    "date": "2024-06-19",
    "total": 8699280,
    "active": 873277,
    "servers": 9360
  },
  {
    "date": "2024-06-20",
    "total": 8697862,
    "active": 873309,
    "servers": 9357
  },
  {
    "date": "2024-06-21",
    "total": 8701334,
    "active": 872576,
    "servers": 9339
  },
  {
    "date": "2024-06-22",
    "total": 8705094,
    "active": 873086,
    "servers": 9328
  },
  {
    "date": "2024-06-23",
    "total": 8711084,
    "active": 872999,
    "servers": 9329
  },
  {
    "date": "2024-06-24",
    "total": 8711443,
    "active": 871846,
    "servers": 9333
  },
  {
    "date": "2024-06-25",
    "total": 8713821,
    "active": 871123,
    "servers": 9307
  },
  {
    "date": "2024-06-26",
    "total": 8715109,
    "active": 870238,
    "servers": 9292
  },
  {
    "date": "2024-06-27",
    "total": 8717137,
    "active": 870310,
    "servers": 9293
  },
  {
    "date": "2024-06-28",
    "total": 8719398,
    "active": 870272,
    "servers": 9290
  },
  {
    "date": "2024-06-29",
    "total": 8721355,
    "active": 870943,
    "servers": 9277
  },
  {
    "date": "2024-06-30",
    "total": 8723097,
    "active": 870501,
    "servers": 9275
  },
  {
    "date": "2024-07-01",
    "total": 8725004,
    "active": 868668,
    "servers": 9281
  },
  {
    "date": "2024-07-02",
    "total": 8725273,
    "active": 867233,
    "servers": 9274
  },
  {
    "date": "2024-07-03",
    "total": 8721947,
    "active": 865542,
    "servers": 9256
  },
  {
    "date": "2024-07-04",
    "total": 8729009,
    "active": 866020,
    "servers": 9270
  },
  {
    "date": "2024-07-05",
    "total": 8727022,
    "active": 865043,
    "servers": 9250
  },
  {
    "date": "2024-07-06",
    "total": 8729019,
    "active": 864433,
    "servers": 9245
  },
  {
    "date": "2024-07-07",
    "total": 8729221,
    "active": 863143,
    "servers": 9239
  },
  {
    "date": "2024-07-08",
    "total": 8731222,
    "active": 861074,
    "servers": 9219
  },
  {
    "date": "2024-07-09",
    "total": 8734488,
    "active": 860544,
    "servers": 9212
  },
  {
    "date": "2024-07-10",
    "total": 8737534,
    "active": 860015,
    "servers": 9219
  },
  {
    "date": "2024-07-11",
    "total": 8739026,
    "active": 857400,
    "servers": 9201
  },
  {
    "date": "2024-07-12",
    "total": 8741318,
    "active": 856602,
    "servers": 9192
  },
  {
    "date": "2024-07-13",
    "total": 8741805,
    "active": 854906,
    "servers": 9170
  },
  {
    "date": "2024-07-14",
    "total": 8747678,
    "active": 856338,
    "servers": 9344
  },
  {
    "date": "2024-07-15",
    "total": 8747551,
    "active": 855448,
    "servers": 9333
  },
  {
    "date": "2024-07-16",
    "total": 8748408,
    "active": 853309,
    "servers": 9356
  },
  {
    "date": "2024-07-17",
    "total": 8750359,
    "active": 854487,
    "servers": 9344
  },
  {
    "date": "2024-07-18",
    "total": 8752779,
    "active": 854964,
    "servers": 9353
  },
  {
    "date": "2024-07-19",
    "total": 8754774,
    "active": 854442,
    "servers": 9351
  },
  {
    "date": "2024-07-20",
    "total": 8755305,
    "active": 855130,
    "servers": 9337
  },
  {
    "date": "2024-07-21",
    "total": 8758528,
    "active": 855453,
    "servers": 9342
  },
  {
    "date": "2024-07-22",
    "total": 8760932,
    "active": 855672,
    "servers": 9348
  },
  {
    "date": "2024-07-23",
    "total": 8762300,
    "active": 855169
  },
  {
    "date": "2024-07-24",
    "total": 8764415,
    "active": 853966
  },
  {
    "date": "2024-07-25",
    "total": 8764984,
    "active": 853102
  },
  {
    "date": "2024-07-26",
    "total": 8767731,
    "active": 853849
  },
  {
    "date": "2024-07-27",
    "total": 8768956,
    "active": 853064
  },
  {
    "date": "2024-07-28",
    "total": 8772466,
    "active": 852234
  },
  {
    "date": "2024-07-29",
    "total": 8774303,
    "active": 851537
  },
  {
    "date": "2024-07-30",
    "total": 8776430,
    "active": 851514
  },
  {
    "date": "2024-07-31",
    "total": 8778498,
    "active": 850601
  },
  {
    "date": "2024-08-01",
    "total": 8778754,
    "active": 849639
  },
  {
    "date": "2024-08-02",
    "total": 8779049,
    "active": 848749
  },
  {
    "date": "2024-08-03",
    "total": 8781002,
    "active": 843316
  },
  {
    "date": "2024-08-04",
    "total": 8782925,
    "active": 842553
  },
  {
    "date": "2024-08-05",
    "total": 8784931,
    "active": 841133
  },
  {
    "date": "2024-08-06",
    "total": 8786442,
    "active": 840070
  },
  {
    "date": "2024-08-07",
    "total": 8788446,
    "active": 840695
  },
  {
    "date": "2024-08-08",
    "total": 8791553,
    "active": 841105
  },
  {
    "date": "2024-08-09",
    "total": 8793420,
    "active": 842774
  },
  {
    "date": "2024-08-10",
    "total": 8795682,
    "active": 843794
  },
  {
    "date": "2024-08-11",
    "total": 8797804,
    "active": 844660
  },
  {
    "date": "2024-08-12",
    "total": 8799680,
    "active": 841589
  },
  {
    "date": "2024-08-13",
    "total": 8800786,
    "active": 840831
  },
  {
    "date": "2024-08-14",
    "total": 8804741,
    "active": 841917
  },
  {
    "date": "2024-08-15",
    "total": 8807729,
    "active": 844064
  },
  {
    "date": "2024-08-16",
    "total": 8808898,
    "active": 844556
  },
  {
    "date": "2024-08-17",
    "total": 8815418,
    "active": 844269
  },
  {
    "date": "2024-08-18",
    "total": 8819116,
    "active": 845322
  },
  {
    "date": "2024-08-19",
    "total": 8817388,
    "active": 842636
  },
  {
    "date": "2024-08-20",
    "total": 8817908,
    "active": 842950
  },
  {
    "date": "2024-08-21",
    "total": 8819837,
    "active": 841942
  },
  {
    "date": "2024-08-22",
    "total": 8822493,
    "active": 843845
  },
  {
    "date": "2024-08-23",
    "total": 8823519,
    "active": 842941
  },
  {
    "date": "2024-08-24",
    "total": 8827070,
    "active": 844173
  },
  {
    "date": "2024-08-25",
    "total": 8824529,
    "active": 842719
  },
  {
    "date": "2024-08-26",
    "total": 8806274,
    "active": 844041
  },
  {
    "date": "2024-08-27",
    "total": 8837343,
    "active": 847363
  },
  {
    "date": "2024-08-28",
    "total": 8838240,
    "active": 849575
  },
  {
    "date": "2024-08-29",
    "total": 8836561,
    "active": 850523
  },
  {
    "date": "2024-08-30",
    "total": 8837477,
    "active": 853752
  },
  {
    "date": "2024-08-31",
    "total": 8840254,
    "active": 857124
  },
  {
    "date": "2024-09-01",
    "total": 8843583,
    "active": 859885
  },
  {
    "date": "2024-09-02",
    "total": 8846912,
    "active": 862646
  },
  {
    "date": "2024-09-03",
    "total": 8849596,
    "active": 863771
  },
  {
    "date": "2024-09-04",
    "total": 9767031,
    "active": 865983,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-05",
    "total": 9770279,
    "active": 868289,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-06",
    "total": 9773086,
    "active": 868827,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-07",
    "total": 9773853,
    "active": 869173,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-08",
    "total": 9777704,
    "active": 871278,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-09",
    "total": 9780439,
    "active": 871478,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-10",
    "total": 9782900,
    "active": 871947,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-11",
    "total": 9784561,
    "active": 867622,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-12",
    "total": 9787576,
    "active": 869546,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-13",
    "total": 9788808,
    "active": 869313,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-14",
    "total": 9793293,
    "active": 868961,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-15",
    "total": 9796426,
    "active": 869116,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-16",
    "total": 9800378,
    "active": 868735,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-17",
    "total": 9801784,
    "active": 869725,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-18",
    "total": 9807147,
    "active": 871888,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-19",
    "total": 9808737,
    "active": 872742,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-20",
    "total": 9793832,
    "active": 874458,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-21",
    "total": 9793835,
    "active": 875674,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-22",
    "total": 9797560,
    "active": 876896,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-23",
    "total": 9798762,
    "active": 875251,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-24",
    "total": 9801393,
    "active": 874882,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-25",
    "total": 9803876,
    "active": 875907,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-26",
    "total": 9806958,
    "active": 877096,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-27",
    "total": 9809314,
    "active": 876793,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-28",
    "total": 9811099,
    "active": 874707,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-29",
    "total": 9786177,
    "active": 872075,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-09-30",
    "total": 9788438,
    "active": 870169,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-01",
    "total": 9790800,
    "active": 867181,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-02",
    "total": 9793140,
    "active": 866891,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-03",
    "total": 9795630,
    "active": 863843,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-04",
    "total": 9802017,
    "active": 861214,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-05",
    "total": 9804069,
    "active": 860961,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-06",
    "total": 9806631,
    "active": 860285,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-07",
    "total": 9809030,
    "active": 858638,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-08",
    "total": 9839326,
    "active": 856824,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-09",
    "total": 9840647,
    "active": 853700,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-10",
    "total": 9843782,
    "active": 852136,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-11",
    "total": 9847720,
    "active": 854598,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-12",
    "total": 9851931,
    "active": 857349,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-10-13",
    "total": 8944513,
    "active": 860299
  },
  {
    "date": "2024-10-14",
    "total": 8950307,
    "active": 862242
  },
  {
    "date": "2024-10-15",
    "total": 8955036,
    "active": 862894
  },
  {
    "date": "2024-10-16",
    "total": 8955850,
    "active": 858478
  },
  {
    "date": "2024-10-17",
    "total": 8969575,
    "active": 856760
  },
  {
    "date": "2024-10-18",
    "total": 8950200,
    "active": 865879
  },
  {
    "date": "2024-10-19",
    "total": 8954778,
    "active": 868555
  },
  {
    "date": "2024-10-20",
    "total": 8979546,
    "active": 872165
  },
  {
    "date": "2024-10-21",
    "total": 8980413,
    "active": 872461
  },
  {
    "date": "2024-10-22",
    "total": 8979611,
    "active": 873877
  },
  {
    "date": "2024-10-23",
    "total": 8983031,
    "active": 875603
  },
  {
    "date": "2024-10-24",
    "total": 8986915,
    "active": 876582
  },
  {
    "date": "2024-10-25",
    "total": 8989388,
    "active": 877478
  },
  {
    "date": "2024-10-26",
    "total": 8991432,
    "active": 878000
  },
  {
    "date": "2024-10-27",
    "total": 8993882,
    "active": 878972
  },
  {
    "date": "2024-10-28",
    "total": 8996503,
    "active": 878881
  },
  {
    "date": "2024-10-29",
    "total": 8997198,
    "active": 880196
  },
  {
    "date": "2024-10-30",
    "total": 9000917,
    "active": 881445
  },
  {
    "date": "2024-10-31",
    "total": 9004224,
    "active": 881992
  },
  {
    "date": "2024-11-01",
    "total": 9005746,
    "active": 883092
  },
  {
    "date": "2024-11-02",
    "total": 9001769,
    "active": 883153
  },
  {
    "date": "2024-11-03",
    "total": 9003811,
    "active": 883164
  },
  {
    "date": "2024-11-04",
    "total": 9005720,
    "active": 882838
  },
  {
    "date": "2024-11-05",
    "total": 9008228,
    "active": 882806
  },
  {
    "date": "2024-11-06",
    "total": 9003997,
    "active": 883425
  },
  {
    "date": "2024-11-07",
    "total": 9014981,
    "active": 888999
  },
  {
    "date": "2024-11-08",
    "total": 9017682,
    "active": 887730
  },
  {
    "date": "2024-11-09",
    "total": 9020383,
    "active": 886461
  },
  {
    "date": "2024-11-10",
    "total": 9023349,
    "active": 885855
  },
  {
    "date": "2024-11-11",
    "total": 9027828,
    "active": 882375
  },
  {
    "date": "2024-11-12",
    "total": 9031300,
    "active": 885470
  },
  {
    "date": "2024-11-13",
    "total": 9035061,
    "active": 886764
  },
  {
    "date": "2024-11-14",
    "total": 9039098,
    "active": 889006
  },
  {
    "date": "2024-11-15",
    "total": 9045238,
    "active": 894476
  },
  {
    "date": "2024-11-16",
    "total": 9051033,
    "active": 903521
  },
  {
    "date": "2024-11-17",
    "total": 9055283,
    "active": 909403
  },
  {
    "date": "2024-11-18",
    "total": 9063138,
    "active": 913953
  },
  {
    "date": "2024-11-19",
    "total": 9066677,
    "active": 919004
  },
  {
    "date": "2024-11-20",
    "total": 9070649,
    "active": 922196
  },
  {
    "date": "2024-11-21",
    "total": 9074678,
    "active": 925547
  },
  {
    "date": "2024-11-22",
    "total": 9078692,
    "active": 927646
  },
  {
    "date": "2024-11-23",
    "total": 9081728,
    "active": 931047
  },
  {
    "date": "2024-11-24",
    "total": 9084311,
    "active": 934715
  },
  {
    "date": "2024-11-25",
    "total": 9087143,
    "active": 936870
  },
  {
    "date": "2024-11-26",
    "total": 9090559,
    "active": 936698
  },
  {
    "date": "2024-11-27",
    "total": 9093223,
    "active": 938736
  },
  {
    "date": "2024-11-28",
    "total": 9093080,
    "active": 932014
  },
  {
    "date": "2024-11-29",
    "total": 9095274,
    "active": 935525
  },
  {
    "date": "2024-11-30",
    "total": 9098068,
    "active": 936727
  },
  {
    "date": "2024-12-01",
    "total": 9100211,
    "active": 938304
  },
  {
    "date": "2024-12-02",
    "total": 9076259,
    "active": 934063
  },
  {
    "date": "2024-12-03",
    "total": 9104585,
    "active": 937091
  },
  {
    "date": "2024-12-04",
    "total": 9107442,
    "active": 936465
  },
  {
    "date": "2024-12-05",
    "total": 9100475,
    "active": 933835
  },
  {
    "date": "2024-12-06",
    "total": 9102036,
    "active": 931734
  },
  {
    "date": "2024-12-07",
    "total": 9102638,
    "active": 929962
  },
  {
    "date": "2024-12-08",
    "total": 9103699,
    "active": 927568
  },
  {
    "date": "2024-12-09",
    "total": 9104419,
    "active": 924538
  },
  {
    "date": "2024-12-10",
    "total": 9118129,
    "active": 922403
  },
  {
    "date": "2024-12-11",
    "total": 10080308,
    "active": 919514,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-12",
    "total": 10070931,
    "active": 914574,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-13",
    "total": 10074102,
    "active": 907536,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-14",
    "total": 10070956,
    "active": 900347,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-15",
    "total": 10073346,
    "active": 893363,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-16",
    "total": 10073964,
    "active": 886779,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-17",
    "total": 10075985,
    "active": 882206,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-18",
    "total": 10078121,
    "active": 877518,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-19",
    "total": 10080257,
    "active": 872830,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-20",
    "total": 10093450,
    "active": 868877,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-21",
    "total": 10095172,
    "active": 865405,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2024-12-22",
    "total": 9138379,
    "active": 860307
  },
  {
    "date": "2024-12-23",
    "total": 9138703,
    "active": 852891
  },
  {
    "date": "2024-12-24",
    "total": 9140044,
    "active": 849564
  },
  {
    "date": "2024-12-25",
    "total": 9133460,
    "active": 843753
  },
  {
    "date": "2024-12-26",
    "total": 9150562,
    "active": 842013
  },
  {
    "date": "2024-12-27",
    "total": 9149348,
    "active": 837068
  },
  {
    "date": "2024-12-28",
    "total": 9152343,
    "active": 835953
  },
  {
    "date": "2024-12-29",
    "total": 9152777,
    "active": 835016
  },
  {
    "date": "2024-12-30",
    "total": 9158759,
    "active": 834126
  },
  {
    "date": "2024-12-31",
    "total": 9161596,
    "active": 832186
  },
  {
    "date": "2025-01-01",
    "total": 9161217,
    "active": 828321
  },
  {
    "date": "2025-01-02",
    "total": 9162436,
    "active": 817828
  },
  {
    "date": "2025-01-03",
    "total": 9161638,
    "active": 816419
  },
  {
    "date": "2025-01-04",
    "total": 9163227,
    "active": 816097
  },
  {
    "date": "2025-01-05",
    "total": 9165529,
    "active": 817663
  },
  {
    "date": "2025-01-06",
    "total": 9166690,
    "active": 816511
  },
  {
    "date": "2025-01-07",
    "total": 9168562,
    "active": 815395,
    "servers": 8533
  },
  {
    "date": "2025-01-08",
    "total": 9171719,
    "active": 815812,
    "servers": 8547
  },
  {
    "date": "2025-01-09",
    "total": 9176475,
    "active": 821385,
    "servers": 8532
  },
  {
    "date": "2025-01-10",
    "total": 9182139,
    "active": 825959,
    "servers": 8512
  },
  {
    "date": "2025-01-11",
    "total": 9187000,
    "active": 829733,
    "servers": 8511
  },
  {
    "date": "2025-01-12",
    "total": 9192580,
    "active": 835283,
    "servers": 8511
  },
  {
    "date": "2025-01-13",
    "total": 9196297,
    "active": 838278,
    "servers": 8509
  },
  {
    "date": "2025-01-14",
    "total": 9205738,
    "active": 844106,
    "servers": 8511
  },
  {
    "date": "2025-01-15",
    "total": 9215936,
    "active": 854417,
    "servers": 8515
  },
  {
    "date": "2025-01-16",
    "total": 9226694,
    "active": 864008,
    "servers": 8510
  },
  {
    "date": "2025-01-17",
    "total": 9235014,
    "active": 872182,
    "servers": 8520
  },
  {
    "date": "2025-01-18",
    "total": 9240838,
    "active": 878930,
    "servers": 8618
  },
  {
    "date": "2025-01-19",
    "total": 9250397,
    "active": 884669,
    "servers": 8591
  },
  {
    "date": "2025-01-20",
    "total": 9261534,
    "active": 896634,
    "servers": 8599
  },
  {
    "date": "2025-01-21",
    "total": 9275161,
    "active": 906124,
    "servers": 8590
  },
  {
    "date": "2025-01-22",
    "total": 9289884,
    "active": 908208,
    "servers": 8578
  },
  {
    "date": "2025-01-23",
    "total": 9306666,
    "active": 928976,
    "servers": 8574
  },
  {
    "date": "2025-01-24",
    "total": 9320002,
    "active": 949304,
    "servers": 8566
  },
  {
    "date": "2025-01-25",
    "total": 9332650,
    "active": 974881,
    "servers": 8547
  },
  {
    "date": "2025-01-26",
    "total": 9343879,
    "active": 985131,
    "servers": 8552
  },
  {
    "date": "2025-01-27",
    "total": 9353900,
    "active": 995158,
    "servers": 8549
  },
  {
    "date": "2025-01-28",
    "total": 9358120,
    "active": 1003299,
    "servers": 8545
  },
  {
    "date": "2025-01-29",
    "total": 9365786,
    "active": 1010915,
    "servers": 8535
  },
  {
    "date": "2025-01-30",
    "total": 9376774,
    "active": 655784,
    "servers": 8529,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-01-31",
    "total": 9383916,
    "active": 734958,
    "servers": 8529,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-02-01",
    "total": 9382734,
    "active": 763649,
    "servers": 8514,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-02-02",
    "total": 9391781,
    "active": 790104,
    "servers": 8539,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-02-03",
    "total": 9397172,
    "active": 804981,
    "servers": 8536,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-02-04",
    "total": 9406117,
    "active": 822232,
    "servers": 8530,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-02-05",
    "total": 9411130,
    "active": 837911,
    "servers": 8535,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-02-06",
    "total": 9416220,
    "active": 847644,
    "servers": 8528,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-02-07",
    "total": 9422171,
    "active": 860547,
    "servers": 8516,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-02-08",
    "total": 9427536,
    "active": 871399,
    "servers": 8793,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2025-02-09",
    "total": 9432155,
    "active": 880611,
    "servers": 8789
  },
  {
    "date": "2025-02-10",
    "total": 9411783,
    "active": 885852,
    "servers": 8775
  },
  {
    "date": "2025-02-11",
    "total": 9440018,
    "active": 886653,
    "servers": 8774
  },
  {
    "date": "2025-02-12",
    "total": 9443635,
    "active": 904998,
    "servers": 8768
  },
  {
    "date": "2025-02-13",
    "total": 9449090,
    "active": 913902,
    "servers": 8758
  },
  {
    "date": "2025-02-14",
    "total": 9452796,
    "active": 920083,
    "servers": 8762
  },
  {
    "date": "2025-02-15",
    "total": 9456644,
    "active": 926404,
    "servers": 8769
  },
  {
    "date": "2025-02-16",
    "total": 9460539,
    "active": 932297,
    "servers": 8769
  },
  {
    "date": "2025-02-17",
    "total": 9464385,
    "active": 937037,
    "servers": 8765
  },
  {
    "date": "2025-02-18",
    "total": 9468000,
    "active": 940096,
    "servers": 8767
  },
  {
    "date": "2025-02-19",
    "total": 9471990,
    "active": 945198,
    "servers": 8750
  },
  {
    "date": "2025-02-20",
    "total": 9401259,
    "active": 939540,
    "servers": 8742,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2025-02-21",
    "total": 9330528,
    "active": 933882,
    "servers": 8737,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2025-02-22",
    "total": 9259796,
    "active": 928223,
    "servers": 8732,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2025-02-23",
    "total": 9189065,
    "active": 922565,
    "servers": 8721,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2025-02-24",
    "total": 9466779,
    "active": 968264,
    "servers": 8713
  },
  {
    "date": "2025-02-25",
    "total": 9473694,
    "active": 974008,
    "servers": 8708
  },
  {
    "date": "2025-02-26",
    "total": 9477585,
    "active": 981089,
    "servers": 8708
  },
  {
    "date": "2025-02-27",
    "total": 9503064,
    "active": 983651,
    "servers": 8688
  },
  {
    "date": "2025-02-28",
    "total": 9506194,
    "active": 980277,
    "servers": 8696
  },
  {
    "date": "2025-03-01",
    "total": 9498667,
    "active": 979439,
    "servers": 8674
  },
  {
    "date": "2025-03-02",
    "total": 9489728,
    "active": 980319,
    "servers": 8671
  },
  {
    "date": "2025-03-03",
    "total": 9495539,
    "active": 972604,
    "servers": 8663
  },
  {
    "date": "2025-03-04",
    "total": 9499963,
    "active": 970379,
    "servers": 8657
  },
  {
    "date": "2025-03-05",
    "total": 9504962,
    "active": 968235,
    "servers": 8640
  },
  {
    "date": "2025-03-06",
    "total": 9515616,
    "active": 974541,
    "servers": 8628
  },
  {
    "date": "2025-03-07",
    "total": 9520728,
    "active": 974332,
    "servers": 8612
  },
  {
    "date": "2025-03-08",
    "total": 9524712,
    "active": 971853,
    "servers": 8589
  },
  {
    "date": "2025-03-09",
    "total": 9527442,
    "active": 970838,
    "servers": 8566
  },
  {
    "date": "2025-03-10",
    "total": 9531836,
    "active": 966765,
    "servers": 8569
  },
  {
    "date": "2025-03-11",
    "total": 9536204,
    "active": 970383,
    "servers": 8583
  },
  {
    "date": "2025-03-12",
    "total": 9540108,
    "active": 969680,
    "servers": 8574
  },
  {
    "date": "2025-03-13",
    "total": 9529326,
    "active": 964074,
    "servers": 8566
  },
  {
    "date": "2025-03-14",
    "total": 9529184,
    "active": 960629,
    "servers": 8561
  },
  {
    "date": "2025-03-15",
    "total": 9535988,
    "active": 959689,
    "servers": 8539
  },
  {
    "date": "2025-03-16",
    "total": 9540198,
    "active": 957263,
    "servers": 8542
  },
  {
    "date": "2025-03-17",
    "total": 9548962,
    "active": 953808,
    "servers": 8529
  },
  {
    "date": "2025-03-18",
    "total": 9553738,
    "active": 952299,
    "servers": 8538
  },
  {
    "date": "2025-03-19",
    "total": 9545785,
    "active": 951043,
    "servers": 8536
  },
  {
    "date": "2025-03-20",
    "total": 9560830,
    "active": 949526,
    "servers": 8517
  },
  {
    "date": "2025-03-21",
    "total": 9562378,
    "active": 948754,
    "servers": 8524
  },
  {
    "date": "2025-03-22",
    "total": 9565254,
    "active": 947935,
    "servers": 8494
  },
  {
    "date": "2025-03-23",
    "total": 9565383,
    "active": 947062,
    "servers": 8499
  },
  {
    "date": "2025-03-24",
    "total": 9571204,
    "active": 948442,
    "servers": 4233,
    "flags": [
      "servers"
    ]
  },
  {
    "date": "2025-03-25",
    "total": 9577025,
    "active": 949821,
    "servers": 8696
  },
  {
    "date": "2025-03-26",
    "total": 9580659,
    "active": 948908,
    "servers": 8695
  },
  {
    "date": "2025-03-27",
    "total": 9584210,
    "active": 946921,
    "servers": 8674
  },
  {
    "date": "2025-03-28",
    "total": 9591648,
    "active": 951827,
    "servers": 8665
  },
  {
    "date": "2025-03-29",
    "total": 9588980,
    "active": 950243,
    "servers": 8646
  },
  {
    "date": "2025-03-30",
    "total": 9594188,
    "active": 950841,
    "servers": 8650
  },
  {
    "date": "2025-03-31",
    "total": 9568484,
    "active": 942351,
    "servers": 8644
  },
  {
    "date": "2025-04-01",
    "total": 9590865,
    "active": 941212,
    "servers": 8762
  },
  {
    "date": "2025-04-02",
    "total": 9597651,
    "active": 940163
  },
  {
    "date": "2025-04-03",
    "total": 9599713,
    "active": 935420
  },
  {
    "date": "2025-04-04",
    "total": 9597866,
    "active": 933675
  },
  {
    "date": "2025-04-05",
    "total": 9601667,
    "active": 931493
  },
  {
    "date": "2025-04-06",
    "total": 9604265,
    "active": 930665
  },
  {
    "date": "2025-04-07",
    "total": 9595605,
    "active": 927665
  },
  {
    "date": "2025-04-08",
    "total": 9602980,
    "active": 924044
  },
  {
    "date": "2025-04-09",
    "total": 9604480,
    "active": 920583
  },
  {
    "date": "2025-04-10",
    "total": 9606171,
    "active": 918201
  },
  {
    "date": "2025-04-11",
    "total": 9609099,
    "active": 915777
  },
  {
    "date": "2025-04-12",
    "total": 9611622,
    "active": 914802
  },
  {
    "date": "2025-04-13",
    "total": 9614066,
    "active": 913443
  },
  {
    "date": "2025-04-14",
    "total": 9591345,
    "active": 905768
  },
  {
    "date": "2025-04-15",
    "total": 9618553,
    "active": 904867
  },
  {
    "date": "2025-04-16",
    "total": 9634146,
    "active": 913773
  },
  {
    "date": "2025-04-17",
    "total": 9640684,
    "active": 915060
  },
  {
    "date": "2025-04-18",
    "total": 9645440,
    "active": 912728
  },
  {
    "date": "2025-04-19",
    "total": 9648535,
    "active": 911910
  },
  {
    "date": "2025-04-20",
    "total": 9651558,
    "active": 908979
  },
  {
    "date": "2025-04-21",
    "total": 9652938,
    "active": 902230
  },
  {
    "date": "2025-04-22",
    "total": 9657807,
    "active": 902719
  },
  {
    "date": "2025-04-23",
    "total": 9660256,
    "active": 901048
  },
  {
    "date": "2025-04-24",
    "total": 9662355,
    "active": 901263
  },
  {
    "date": "2025-04-25",
    "total": 9664614,
    "active": 898305
  },
  {
    "date": "2025-04-26",
    "total": 9666925,
    "active": 892294
  },
  {
    "date": "2025-04-27",
    "total": 9669481,
    "active": 889372
  },
  {
    "date": "2025-04-28",
    "total": 9672411,
    "active": 887020
  },
  {
    "date": "2025-04-29",
    "total": 9676092,
    "active": 884893
  },
  {
    "date": "2025-04-30",
    "total": 9675099,
    "active": 882480
  },
  {
    "date": "2025-05-01",
    "total": 9674481,
    "active": 879730
  },
  {
    "date": "2025-05-02",
    "total": 9678330,
    "active": 877746
  },
  {
    "date": "2025-05-03",
    "total": 9679174,
    "active": 875062
  },
  {
    "date": "2025-05-04",
    "total": 9681826,
    "active": 873959
  },
  {
    "date": "2025-05-05",
    "total": 9683312,
    "active": 871514
  },
  {
    "date": "2025-05-06",
    "total": 9685789,
    "active": 868915
  },
  {
    "date": "2025-05-07",
    "total": 9686264,
    "active": 868672
  },
  {
    "date": "2025-05-08",
    "total": 9711892,
    "active": 864441
  },
  {
    "date": "2025-05-09",
    "total": 9714002,
    "active": 862425
  },
  {
    "date": "2025-05-10",
    "total": 9684344,
    "active": 860576
  },
  {
    "date": "2025-05-11",
    "total": 9707273,
    "active": 861860
  },
  {
    "date": "2025-05-12",
    "total": 9718774,
    "active": 855290
  },
  {
    "date": "2025-05-13",
    "total": 9720390,
    "active": 853705
  },
  {
    "date": "2025-05-14",
    "total": 9723605,
    "active": 851190
  },
  {
    "date": "2025-05-15",
    "total": 9695349,
    "active": 844540
  },
  {
    "date": "2025-05-16",
    "total": 9696973,
    "active": 843572
  },
  {
    "date": "2025-05-17",
    "total": 9729635,
    "active": 843607
  },
  {
    "date": "2025-05-18",
    "total": 9707600,
    "active": 841433
  },
  {
    "date": "2025-05-19",
    "total": 9710027,
    "active": 837187
  },
  {
    "date": "2025-05-20",
    "total": 9737882,
    "active": 833472
  },
  {
    "date": "2025-05-21",
    "total": 9728925,
    "active": 831404
  },
  {
    "date": "2025-05-22",
    "total": 9700436,
    "active": 830159
  },
  {
    "date": "2025-05-23",
    "total": 9732645,
    "active": 828327
  },
  {
    "date": "2025-05-24",
    "total": 9734994,
    "active": 826861
  },
  {
    "date": "2025-05-25",
    "total": 9728727,
    "active": 828040
  },
  {
    "date": "2025-05-26",
    "total": 9709319,
    "active": 824561
  },
  {
    "date": "2025-05-27",
    "total": 9718981,
    "active": 823147
  },
  {
    "date": "2025-05-28",
    "total": 9718107,
    "active": 820778
  },
  {
    "date": "2025-05-29",
    "total": 9720406,
    "active": 819965
  },
  {
    "date": "2025-05-30",
    "total": 9725471,
    "active": 818161
  },
  {
    "date": "2025-05-31",
    "total": 9727215,
    "active": 815675
  },
  {
    "date": "2025-06-01",
    "total": 9726070,
    "active": 813879
  },
  {
    "date": "2025-06-02",
    "total": 9728781,
    "active": 811452
  },
  {
    "date": "2025-06-03",
    "total": 9731223,
    "active": 810343
  },
  {
    "date": "2025-06-04",
    "total": 9733134,
    "active": 808708
  },
  {
    "date": "2025-06-05",
    "total": 9728623,
    "active": 807330
  },
  {
    "date": "2025-06-06",
    "total": 9729972,
    "active": 806069
  },
  {
    "date": "2025-06-07",
    "total": 9726289,
    "active": 804845
  },
  {
    "date": "2025-06-08",
    "total": 9733209,
    "active": 805361
  },
  {
    "date": "2025-06-09",
    "total": 9737348,
    "active": 804494
  },
  {
    "date": "2025-06-10",
    "total": 9709490,
    "active": 803003
  },
  {
    "date": "2025-06-11",
    "total": 9681632,
    "active": 801512
  },
  {
    "date": "2025-06-12",
    "total": 9709375,
    "active": 804907
  },
  {
    "date": "2025-06-13",
    "total": 9711433,
    "active": 804497
  },
  {
    "date": "2025-06-14",
    "total": 9713172,
    "active": 802277
  },
  {
    "date": "2025-06-15",
    "total": 9713927,
    "active": 801952
  },
  {
    "date": "2025-06-16",
    "total": 9715271,
    "active": 799469
  },
  {
    "date": "2025-06-17",
    "total": 9714509,
    "active": 799493
  },
  {
    "date": "2025-06-18",
    "total": 9715718,
    "active": 798627
  },
  {
    "date": "2025-06-19",
    "total": 9715838,
    "active": 800419
  },
  {
    "date": "2025-06-20",
    "total": 9717925,
    "active": 802959
  },
  {
    "date": "2025-06-21",
    "total": 9718669,
    "active": 802709
  },
  {
    "date": "2025-06-22",
    "total": 9719951,
    "active": 801027
  },
  {
    "date": "2025-06-23",
    "total": 9721304,
    "active": 800871
  },
  {
    "date": "2025-06-24",
    "total": 9723105,
    "active": 800352
  },
  {
    "date": "2025-06-25",
    "total": 9750890,
    "active": 800370
  },
  {
    "date": "2025-06-26",
    "total": 9727367,
    "active": 797067
  },
  {
    "date": "2025-06-27",
    "total": 9755013,
    "active": 799055
  },
  {
    "date": "2025-06-28",
    "total": 9756597,
    "active": 799685
  },
  {
    "date": "2025-06-29",
    "total": 9759265,
    "active": 799720
  },
  {
    "date": "2025-06-30",
    "total": 9760492,
    "active": 796768
  },
  {
    "date": "2025-07-01",
    "total": 9762545,
    "active": 795449
  },
  {
    "date": "2025-07-02",
    "total": 9764542,
    "active": 796435
  },
  {
    "date": "2025-07-03",
    "total": 9739048,
    "active": 793966
  },
  {
    "date": "2025-07-04",
    "total": 9766461,
    "active": 796316
  },
  {
    "date": "2025-07-05",
    "total": 9767671,
    "active": 795507
  },
  {
    "date": "2025-07-06",
    "total": 9743953,
    "active": 792471
  },
  {
    "date": "2025-07-07",
    "total": 9744920,
    "active": 791380
  },
  {
    "date": "2025-07-08",
    "total": 9746645,
    "active": 789464
  },
  {
    "date": "2025-07-09",
    "total": 9748706,
    "active": 787348
  },
  {
    "date": "2025-07-10",
    "total": 9748194,
    "active": 788016,
    "servers": 8457
  },
  {
    "date": "2025-07-11",
    "total": 9750419,
    "active": 775355,
    "servers": 8452
  },
  {
    "date": "2025-07-12",
    "total": 9749655,
    "active": 779372,
    "servers": 8439
  },
  {
    "date": "2025-07-13",
    "total": 9751484,
    "active": 779430,
    "servers": 8429
  },
  {
    "date": "2025-07-14",
    "total": 9756219,
    "active": 778276,
    "servers": 8436
  },
  {
    "date": "2025-07-15",
    "total": 9769403,
    "active": 778994,
    "servers": 8446
  },
  {
    "date": "2025-07-16",
    "total": 9771680,
    "active": 778678,
    "servers": 8441
  },
  {
    "date": "2025-07-17",
    "total": 9772375,
    "active": 776271,
    "servers": 8433
  },
  {
    "date": "2025-07-18",
    "total": 9773834,
    "active": 774593,
    "servers": 8421
  },
  {
    "date": "2025-07-19",
    "total": 9775293,
    "active": 772915,
    "servers": 8423
  },
  {
    "date": "2025-07-20",
    "total": 9775614,
    "active": 772384,
    "servers": 8421
  },
  {
    "date": "2025-07-21",
    "total": 9778216,
    "active": 770431,
    "servers": 8421
  },
  {
    "date": "2025-07-22",
    "total": 9780308,
    "active": 769510,
    "servers": 8419
  },
  {
    "date": "2025-07-23",
    "total": 9782962,
    "active": 769852,
    "servers": 8415
  },
  {
    "date": "2025-07-24",
    "total": 9784997,
    "active": 769763,
    "servers": 8388
  },
  {
    "date": "2025-07-25",
    "total": 9761697,
    "active": 767651,
    "servers": 8391
  },
  {
    "date": "2025-07-26",
    "total": 9788320,
    "active": 768725,
    "servers": 8382
  },
  {
    "date": "2025-07-27",
    "total": 9788161,
    "active": 768072,
    "servers": 8375
  },
  {
    "date": "2025-07-28",
    "total": 9798783,
    "active": 766340,
    "servers": 8370
  },
  {
    "date": "2025-07-29",
    "total": 9830574,
    "active": 766969,
    "servers": 8373
  },
  {
    "date": "2025-07-30",
    "total": 9805748,
    "active": 766709,
    "servers": 8355
  },
  {
    "date": "2025-07-31",
    "total": 9807061,
    "active": 765714,
    "servers": 8352
  },
  {
    "date": "2025-08-01",
    "total": 9795191,
    "active": 766709,
    "servers": 8352
  },
  {
    "date": "2025-08-02",
    "total": 9786039,
    "active": 765667,
    "servers": 8333
  },
  {
    "date": "2025-08-03",
    "total": 9783480,
    "active": 766244,
    "servers": 8344
  },
  {
    "date": "2025-08-04",
    "total": 9783017,
    "active": 764456,
    "servers": 8336
  },
  {
    "date": "2025-08-05",
    "total": 9785589,
    "active": 764386,
    "servers": 8332
  },
  {
    "date": "2025-08-06",
    "total": 9788075,
    "active": 764951,
    "servers": 8317
  },
  {
    "date": "2025-08-07",
    "total": 9801283,
    "active": 765300,
    "servers": 8315
  },
  {
    "date": "2025-08-08",
    "total": 9803724,
    "active": 766243,
    "servers": 8305
  },
  {
    "date": "2025-08-09",
    "total": 9803391,
    "active": 766424,
    "servers": 8298
  },
  {
    "date": "2025-08-10",
    "total": 9805062,
    "active": 767636,
    "servers": 8294
  },
  {
    "date": "2025-08-11",
    "total": 9781703,
    "active": 764792,
    "servers": 8293
  },
  {
    "date": "2025-08-12",
    "total": 9784243,
    "active": 766068,
    "servers": 8289
  },
  {
    "date": "2025-08-13",
    "total": 9785446,
    "active": 766546,
    "servers": 8279
  },
  {
    "date": "2025-08-14",
    "total": 9787678,
    "active": 766952,
    "servers": 8275
  },
  {
    "date": "2025-08-15",
    "total": 9812634,
    "active": 770059,
    "servers": 8261
  },
  {
    "date": "2025-08-16",
    "total": 9817110,
    "active": 770680,
    "servers": 8253
  },
  {
    "date": "2025-08-17",
    "total": 9820212,
    "active": 770518,
    "servers": 8261
  },
  {
    "date": "2025-08-18",
    "total": 9822689,
    "active": 769604,
    "servers": 8260
  },
  {
    "date": "2025-08-19",
    "total": 9825849,
    "active": 770830,
    "servers": 8255
  },
  {
    "date": "2025-08-20",
    "total": 9827589,
    "active": 770593,
    "servers": 8243
  },
  {
    "date": "2025-08-21",
    "total": 9829424,
    "active": 770684,
    "servers": 8239
  },
  {
    "date": "2025-08-22",
    "total": 9819949,
    "active": 771123,
    "servers": 8237
  },
  {
    "date": "2025-08-23",
    "total": 9821143,
    "active": 769609,
    "servers": 8225
  },
  {
    "date": "2025-08-24",
    "total": 9823365,
    "active": 768201,
    "servers": 8232
  },
  {
    "date": "2025-08-25",
    "total": 9825458,
    "active": 766861,
    "servers": 8226
  },
  {
    "date": "2025-08-26",
    "total": 9827415,
    "active": 766127,
    "servers": 8206
  },
  {
    "date": "2025-08-27",
    "total": 9826097,
    "active": 763989,
    "servers": 8202
  },
  {
    "date": "2025-08-28",
    "total": 9827867,
    "active": 763037,
    "servers": 8199
  },
  {
    "date": "2025-08-29",
    "total": 9829989,
    "active": 760344,
    "servers": 8185
  },
  {
    "date": "2025-08-30",
    "total": 9830769,
    "active": 760520,
    "servers": 8178
  },
  {
    "date": "2025-08-31",
    "total": 9833065,
    "active": 760551,
    "servers": 8178
  },
  {
    "date": "2025-09-01",
    "total": 9837336,
    "active": 753296,
    "servers": 8178
  },
  {
    "date": "2025-09-02",
    "total": 9833089,
    "active": 757730,
    "servers": 8173
  },
  {
    "date": "2025-09-03",
    "total": 9835420,
    "active": 758957,
    "servers": 8164
  },
  {
    "date": "2025-09-04",
    "total": 9842965,
    "active": 759782,
    "servers": 8155
  },
  {
    "date": "2025-09-05",
    "total": 9844734,
    "active": 759531,
    "servers": 8155
  },
  {
    "date": "2025-09-06",
    "total": 9838502,
    "active": 758807,
    "servers": 8151
  },
  {
    "date": "2025-09-07",
    "total": 9848420,
    "active": 758450,
    "servers": 8156
  },
  {
    "date": "2025-09-08",
    "total": 9850082,
    "active": 756506,
    "servers": 8141
  },
  {
    "date": "2025-09-09",
    "total": 9852006,
    "active": 755653,
    "servers": 8144
  },
  {
    "date": "2025-09-10",
    "total": 9854074,
    "active": 754797,
    "servers": 8142
  },
  {
    "date": "2025-09-11",
    "total": 9855588,
    "active": 754960,
    "servers": 8134
  },
  {
    "date": "2025-09-12",
    "total": 9849413,
    "active": 755842,
    "servers": 8122
  },
  {
    "date": "2025-09-13",
    "total": 9859722,
    "active": 757618,
    "servers": 8122
  },
  {
    "date": "2025-09-14",
    "total": 9862628,
    "active": 758458,
    "servers": 8120
  },
  {
    "date": "2025-09-15",
    "total": 9863262,
    "active": 757958,
    "servers": 8123
  },
  {
    "date": "2025-09-16",
    "total": 9864902,
    "active": 758630,
    "servers": 8120
  },
  {
    "date": "2025-09-17",
    "total": 9859026,
    "active": 759583,
    "servers": 8122
  },
  {
    "date": "2025-09-18",
    "total": 9853987,
    "active": 763171,
    "servers": 8112
  },
  {
    "date": "2025-09-19",
    "total": 9846609,
    "active": 762229,
    "servers": 8098
  },
  {
    "date": "2025-09-20",
    "total": 9848511,
    "active": 763052,
    "servers": 8092
  },
  {
    "date": "2025-09-21",
    "total": 9845326,
    "active": 764923,
    "servers": 8092
  },
  {
    "date": "2025-09-22",
    "total": 9834138,
    "active": 765012,
    "servers": 8085
  },
  {
    "date": "2025-09-23",
    "total": 9836295,
    "active": 766285,
    "servers": 8094
  },
  {
    "date": "2025-09-24",
    "total": 9837482,
    "active": 766397,
    "servers": 8088
  },
  {
    "date": "2025-09-25",
    "total": 9838956,
    "active": 766025,
    "servers": 8089
  },
  {
    "date": "2025-09-26",
    "total": 9841160,
    "active": 765753,
    "servers": 8084
  },
  {
    "date": "2025-09-27",
    "total": 9843837,
    "active": 764188,
    "servers": 8074
  },
  {
    "date": "2025-09-28",
    "total": 9842973,
    "active": 763658,
    "servers": 8071
  },
  {
    "date": "2025-09-29",
    "total": 9844969,
    "active": 760526,
    "servers": 8071
  },
  {
    "date": "2025-09-30",
    "total": 9845524,
    "active": 759239,
    "servers": 8060
  },
  {
    "date": "2025-10-01",
    "total": 9846573,
    "active": 759429,
    "servers": 8050
  },
  {
    "date": "2025-10-02",
    "total": 9848140,
    "active": 757636,
    "servers": 8044
  },
  {
    "date": "2025-10-03",
    "total": 9849816,
    "active": 758078,
    "servers": 8041
  },
  {
    "date": "2025-10-04",
    "total": 9852145,
    "active": 758957,
    "servers": 8029
  },
  {
    "date": "2025-10-05",
    "total": 9826842,
    "active": 758305,
    "servers": 8021
  },
  {
    "date": "2025-10-06",
    "total": 9827881,
    "active": 758501,
    "servers": 8025
  },
  {
    "date": "2025-10-07",
    "total": 9820747,
    "active": 758476,
    "servers": 8022
  },
  {
    "date": "2025-10-08",
    "total": 9849396,
    "active": 759672,
    "servers": 8020
  },
  {
    "date": "2025-10-09",
    "total": 9851071,
    "active": 758859,
    "servers": 8012
  },
  {
    "date": "2025-10-10",
    "total": 9878040,
    "active": 760260,
    "servers": 8001
  },
  {
    "date": "2025-10-11",
    "total": 9879724,
    "active": 759984,
    "servers": 7997
  },
  {
    "date": "2025-10-12",
    "total": 9881552,
    "active": 759603,
    "servers": 7995
  },
  {
    "date": "2025-10-13",
    "total": 9884647,
    "active": 758433,
    "servers": 8000
  },
  {
    "date": "2025-10-14",
    "total": 9868361,
    "active": 755968,
    "servers": 7991
  },
  {
    "date": "2025-10-15",
    "total": 9865805,
    "active": 752946,
    "servers": 7987
  },
  {
    "date": "2025-10-16",
    "total": 9867954,
    "active": 749874,
    "servers": 7985
  },
  {
    "date": "2025-10-17",
    "total": 9870017,
    "active": 748352,
    "servers": 7967
  },
  {
    "date": "2025-10-18",
    "total": 9458730,
    "active": 735547,
    "servers": 7957,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2025-10-19",
    "total": 9460037,
    "active": 732956,
    "servers": 7965
  },
  {
    "date": "2025-10-20",
    "total": 9436309,
    "active": 729973,
    "servers": 7962
  },
  {
    "date": "2025-10-21",
    "total": 9464143,
    "active": 730387,
    "servers": 7958
  },
  {
    "date": "2025-10-22",
    "total": 9464135,
    "active": 729909,
    "servers": 7955
  },
  {
    "date": "2025-10-23",
    "total": 9465716,
    "active": 729582,
    "servers": 7944
  },
  {
    "date": "2025-10-24",
    "total": 9467399,
    "active": 729567,
    "servers": 7936
  },
  {
    "date": "2025-10-25",
    "total": 9468426,
    "active": 729983,
    "servers": 7925
  },
  {
    "date": "2025-10-26",
    "total": 9470242,
    "active": 730114,
    "servers": 7919
  },
  {
    "date": "2025-10-27",
    "total": 9471723,
    "active": 729354,
    "servers": 7918
  },
  {
    "date": "2025-10-28",
    "total": 9473209,
    "active": 728286,
    "servers": 7901
  },
  {
    "date": "2025-10-29",
    "total": 9474775,
    "active": 727292,
    "servers": 7907
  },
  {
    "date": "2025-10-30",
    "total": 9467696,
    "active": 726765,
    "servers": 7909
  },
  {
    "date": "2025-10-31",
    "total": 9476504,
    "active": 727106,
    "servers": 7898
  },
  {
    "date": "2025-11-01",
    "total": 9475281,
    "active": 726237,
    "servers": 7886
  },
  {
    "date": "2025-11-02",
    "total": 9480348,
    "active": 725766,
    "servers": 7893
  },
  {
    "date": "2025-11-03",
    "total": 9479382,
    "active": 724346,
    "servers": 7878
  },
  {
    "date": "2025-11-04",
    "total": 9480328,
    "active": 723758,
    "servers": 7871
  },
  {
    "date": "2025-11-05",
    "total": 9483929,
    "active": 725265,
    "servers": 7867
  },
  {
    "date": "2025-11-06",
    "total": 9484974,
    "active": 725253,
    "servers": 7864
  },
  {
    "date": "2025-11-07",
    "total": 9487439,
    "active": 725864,
    "servers": 7851
  },
  {
    "date": "2025-11-08",
    "total": 9486253,
    "active": 725488,
    "servers": 7831
  },
  {
    "date": "2025-11-09",
    "total": 9486080,
    "active": 724293,
    "servers": 7818
  },
  {
    "date": "2025-11-10",
    "total": 9487600,
    "active": 724014,
    "servers": 7818
  },
  {
    "date": "2025-11-11",
    "total": 9487116,
    "active": 722827,
    "servers": 7798
  },
  {
    "date": "2025-11-12",
    "total": 9489325,
    "active": 722113,
    "servers": 7799
  },
  {
    "date": "2025-11-13",
    "total": 9491210,
    "active": 722850,
    "servers": 7795
  },
  {
    "date": "2025-11-14",
    "total": 9491699,
    "active": 722054,
    "servers": 7796
  },
  {
    "date": "2025-11-15",
    "total": 9491138,
    "active": 721993,
    "servers": 7778
  },
  {
    "date": "2025-11-16",
    "total": 9493301,
    "active": 722320,
    "servers": 7778
  },
  {
    "date": "2025-11-17",
    "total": 9495096,
    "active": 720329,
    "servers": 7786
  },
  {
    "date": "2025-11-18",
    "total": 9497066,
    "active": 718950,
    "servers": 7786
  },
  {
    "date": "2025-11-19",
    "total": 9498904,
    "active": 720969,
    "servers": 7785
  },
  {
    "date": "2025-11-20",
    "total": 9500649,
    "active": 720442,
    "servers": 7776
  },
  {
    "date": "2025-11-21",
    "total": 9503394,
    "active": 720059,
    "servers": 7762
  },
  {
    "date": "2025-11-22",
    "total": 9504795,
    "active": 718886,
    "servers": 7758
  },
  {
    "date": "2025-11-23",
    "total": 9507554,
    "active": 718337,
    "servers": 7750
  },
  {
    "date": "2025-11-24",
    "total": 9508970,
    "active": 718270,
    "servers": 7749
  },
  {
    "date": "2025-11-25",
    "total": 9511989,
    "active": 717820,
    "servers": 7740
  },
  {
    "date": "2025-11-26",
    "total": 9508579,
    "active": 718922,
    "servers": 7735
  },
  {
    "date": "2025-11-27",
    "total": 9512371,
    "active": 719552,
    "servers": 7731
  },
  {
    "date": "2025-11-28",
    "total": 9515517,
    "active": 721217,
    "servers": 7721
  },
  {
    "date": "2025-11-29",
    "total": 9519160,
    "active": 720240,
    "servers": 7721
  },
  {
    "date": "2025-11-30",
    "total": 9521831,
    "active": 720931,
    "servers": 7723
  },
  {
    "date": "2025-12-01",
    "total": 9524090,
    "active": 719686,
    "servers": 7719
  },
  {
    "date": "2025-12-02",
    "total": 9526520,
    "active": 719016,
    "servers": 7720
  },
  {
    "date": "2025-12-03",
    "total": 9526139,
    "active": 718329,
    "servers": 7721
  },
  {
    "date": "2025-12-04",
    "total": 9530621,
    "active": 718758,
    "servers": 7703
  },
  {
    "date": "2025-12-05",
    "total": 9532646,
    "active": 717882,
    "servers": 7701
  },
  {
    "date": "2025-12-06",
    "total": 9533433,
    "active": 718223,
    "servers": 7687
  },
  {
    "date": "2025-12-07",
    "total": 9535759,
    "active": 718795,
    "servers": 7678
  },
  {
    "date": "2025-12-08",
    "total": 9537730,
    "active": 718802,
    "servers": 7679
  },
  {
    "date": "2025-12-09",
    "total": 9540439,
    "active": 719558,
    "servers": 7667
  },
  {
    "date": "2025-12-10",
    "total": 9533334,
    "active": 719524,
    "servers": 7665
  },
  {
    "date": "2025-12-11",
    "total": 9536479,
    "active": 720486,
    "servers": 7657
  },
  {
    "date": "2025-12-12",
    "total": 9537162,
    "active": 723146,
    "servers": 7648
  },
  {
    "date": "2025-12-13",
    "total": 9542112,
    "active": 725250,
    "servers": 7644
  },
  {
    "date": "2025-12-14",
    "total": 9544835,
    "active": 725709,
    "servers": 7639
  },
  {
    "date": "2025-12-15",
    "total": 9550664,
    "active": 729581,
    "servers": 8155
  },
  {
    "date": "2025-12-16",
    "total": 9550492,
    "active": 729211,
    "servers": 8149
  },
  {
    "date": "2025-12-17",
    "total": 9552305,
    "active": 729473,
    "servers": 8148
  },
  {
    "date": "2025-12-18",
    "total": 9554713,
    "active": 727939,
    "servers": 8131
  },
  {
    "date": "2025-12-19",
    "total": 9557583,
    "active": 728820,
    "servers": 8133
  },
  {
    "date": "2025-12-20",
    "total": 9560630,
    "active": 728992,
    "servers": 8135
  },
  {
    "date": "2025-12-21",
    "total": 9564469,
    "active": 728726,
    "servers": 8134
  },
  {
    "date": "2025-12-22",
    "total": 9564526,
    "active": 729210,
    "servers": 8129
  },
  {
    "date": "2025-12-23",
    "total": 9567067,
    "active": 729065,
    "servers": 8132
  },
  {
    "date": "2025-12-24",
    "total": 9569406,
    "active": 728772,
    "servers": 8128
  },
  {
    "date": "2025-12-25",
    "total": 9571674,
    "active": 727674,
    "servers": 8129
  },
  {
    "date": "2025-12-26",
    "total": 9573690,
    "active": 728003,
    "servers": 8117
  },
  {
    "date": "2025-12-27",
    "total": 9572919,
    "active": 730173,
    "servers": 8168
  },
  {
    "date": "2025-12-28",
    "total": 9563812,
    "active": 732710,
    "servers": 8166
  },
  {
    "date": "2025-12-29",
    "total": 9569814,
    "active": 735518,
    "servers": 8160
  },
  {
    "date": "2025-12-30",
    "total": 9571931,
    "active": 738401,
    "servers": 8153
  },
  {
    "date": "2025-12-31",
    "total": 9572527,
    "active": 738728,
    "servers": 8157
  },
  {
    "date": "2026-01-01",
    "total": 9575585,
    "active": 738921,
    "servers": 8171
  },
  {
    "date": "2026-01-02",
    "total": 9577640,
    "active": 739278,
    "servers": 8154
  },
  {
    "date": "2026-01-03",
    "total": 9580363,
    "active": 741354,
    "servers": 8169
  },
  {
    "date": "2026-01-04",
    "total": 9585576,
    "active": 743383,
    "servers": 8162
  },
  {
    "date": "2026-01-05",
    "total": 9599780,
    "active": 745348,
    "servers": 8171
  },
  {
    "date": "2026-01-06",
    "total": 9602198,
    "active": 746938,
    "servers": 8164
  },
  {
    "date": "2026-01-07",
    "total": 9604949,
    "active": 747908,
    "servers": 8153
  },
  {
    "date": "2026-01-08",
    "total": 9607014,
    "active": 748672,
    "servers": 8147
  },
  {
    "date": "2026-01-09",
    "total": 9609876,
    "active": 749138,
    "servers": 8137
  },
  {
    "date": "2026-01-10",
    "total": 9578661,
    "active": 748672,
    "servers": 8129
  },
  {
    "date": "2026-01-11",
    "total": 9615244,
    "active": 752206,
    "servers": 8128
  },
  {
    "date": "2026-01-12",
    "total": 9617759,
    "active": 753087,
    "servers": 8130
  },
  {
    "date": "2026-01-13",
    "total": 9627273,
    "active": 757790,
    "servers": 8122
  },
  {
    "date": "2026-01-14",
    "total": 9633189,
    "active": 761858,
    "servers": 8135
  },
  {
    "date": "2026-01-15",
    "total": 9621223,
    "active": 764095,
    "servers": 8120
  },
  {
    "date": "2026-01-16",
    "total": 9623680,
    "active": 765039,
    "servers": 8118
  },
  {
    "date": "2026-01-17",
    "total": 9637798,
    "active": 767501,
    "servers": 8109
  },
  {
    "date": "2026-01-18",
    "total": 9639839,
    "active": 768310,
    "servers": 8112
  },
  {
    "date": "2026-01-19",
    "total": 9643748,
    "active": 770404,
    "servers": 8096
  },
  {
    "date": "2026-01-20",
    "total": 9639702,
    "active": 773191,
    "servers": 8093
  },
  {
    "date": "2026-01-21",
    "total": 9640566,
    "active": 772255,
    "servers": 8085
  },
  {
    "date": "2026-01-22",
    "total": 9643886,
    "active": 777170,
    "servers": 8072
  },
  {
    "date": "2026-01-23",
    "total": 9655005,
    "active": 779836,
    "servers": 8065
  },
  {
    "date": "2026-01-24",
    "total": 9657792,
    "active": 780978,
    "servers": 8061
  },
  {
    "date": "2026-01-25",
    "total": 9657795,
    "active": 782313,
    "servers": 8056
  },
  {
    "date": "2026-01-26",
    "total": 9662830,
    "active": 785237,
    "servers": 8054
  },
  {
    "date": "2026-01-27",
    "total": 9663565,
    "active": 785074,
    "servers": 8053
  },
  {
    "date": "2026-01-28",
    "total": 9670379,
    "active": 787557,
    "servers": 8057
  },
  {
    "date": "2026-01-29",
    "total": 9680674,
    "active": 790441,
    "servers": 8055
  },
  {
    "date": "2026-01-30",
    "total": 9676188,
    "active": 790099,
    "servers": 8055
  },
  {
    "date": "2026-01-31",
    "total": 9679335,
    "active": 790422,
    "servers": 8042
  },
  {
    "date": "2026-02-01",
    "total": 9663801,
    "active": 788937,
    "servers": 8042
  },
  {
    "date": "2026-02-02",
    "total": 9666900,
    "active": 788660,
    "servers": 8035
  },
  {
    "date": "2026-02-03",
    "total": 9676667,
    "active": 794265,
    "servers": 8040
  },
  {
    "date": "2026-02-04",
    "total": 9678641,
    "active": 794363,
    "servers": 8038
  },
  {
    "date": "2026-02-05",
    "total": 9681199,
    "active": 794893,
    "servers": 8035
  },
  {
    "date": "2026-02-06",
    "total": 9684317,
    "active": 794340,
    "servers": 8035
  },
  {
    "date": "2026-02-07",
    "total": 9687519,
    "active": 794651,
    "servers": 8033
  },
  {
    "date": "2026-02-08",
    "total": 9689777,
    "active": 796714,
    "servers": 8030
  },
  {
    "date": "2026-02-09",
    "total": 9692388,
    "active": 793913,
    "servers": 8017
  },
  {
    "date": "2026-02-10",
    "total": 9466445,
    "active": 793147,
    "servers": 8016,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2026-02-11",
    "total": 9469609,
    "active": 792163,
    "servers": 8015,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2026-02-12",
    "total": 9460922,
    "active": 790226,
    "servers": 8020,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2026-02-13",
    "total": 9442334,
    "active": 788867,
    "servers": 8012,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2026-02-14",
    "total": 9677458,
    "active": 789484,
    "servers": 8009
  },
  {
    "date": "2026-02-15",
    "total": 9682391,
    "active": 787350,
    "servers": 8007
  },
  {
    "date": "2026-02-16",
    "total": 9706257,
    "active": 786132,
    "servers": 8003
  },
  {
    "date": "2026-02-17",
    "total": 9709098,
    "active": 784686,
    "servers": 8001
  },
  {
    "date": "2026-02-18",
    "total": 9711833,
    "active": 785081,
    "servers": 7994
  },
  {
    "date": "2026-02-19",
    "total": 9714337,
    "active": 783317,
    "servers": 7991
  },
  {
    "date": "2026-02-20",
    "total": 9717759,
    "active": 780890,
    "servers": 7989
  },
  {
    "date": "2026-02-21",
    "total": 9720038,
    "active": 780748,
    "servers": 7985
  },
  {
    "date": "2026-02-22",
    "total": 9723053,
    "active": 780015,
    "servers": 7979
  },
  {
    "date": "2026-02-23",
    "total": 9725810,
    "active": 777983,
    "servers": 7973
  },
  {
    "date": "2026-02-24",
    "total": 9727851,
    "active": 775998,
    "servers": 7968
  },
  {
    "date": "2026-02-25",
    "total": 9732293,
    "active": 775870,
    "servers": 7956
  },
  {
    "date": "2026-02-26",
    "total": 9735578,
    "active": 774357,
    "servers": 7955
  },
  {
    "date": "2026-02-27",
    "total": 9736552,
    "active": 772570,
    "servers": 7950
  },
  {
    "date": "2026-02-28",
    "total": 9737930,
    "active": 770854,
    "servers": 7938
  },
  {
    "date": "2026-03-01",
    "total": 9738303,
    "active": 770483,
    "servers": 7940
  },
  {
    "date": "2026-03-02",
    "total": 9740349,
    "active": 769838,
    "servers": 7942
  },
  {
    "date": "2026-03-03",
    "total": 9741675,
    "active": 769897,
    "servers": 7941
  },
  {
    "date": "2026-03-04",
    "total": 9746243,
    "active": 767541,
    "servers": 7925
  },
  {
    "date": "2026-03-05",
    "total": 9748304,
    "active": 766678,
    "servers": 7923
  },
  {
    "date": "2026-03-06",
    "total": 9751439,
    "active": 766992,
    "servers": 7912
  },
  {
    "date": "2026-03-07",
    "total": 9753816,
    "active": 765467,
    "servers": 7904
  },
  {
    "date": "2026-03-08",
    "total": 9755916,
    "active": 764009,
    "servers": 7915
  },
  {
    "date": "2026-03-09",
    "total": 9760681,
    "active": 763980,
    "servers": 7909
  },
  {
    "date": "2026-03-10",
    "total": 9761408,
    "active": 763981,
    "servers": 7915
  },
  {
    "date": "2026-03-11",
    "total": 9764211,
    "active": 763926,
    "servers": 7911
  },
  {
    "date": "2026-03-12",
    "total": 9765304,
    "active": 763204,
    "servers": 7907
  },
  {
    "date": "2026-03-13",
    "total": 9767899,
    "active": 763400,
    "servers": 7906
  },
  {
    "date": "2026-03-14",
    "total": 9770270,
    "active": 762824,
    "servers": 7909
  },
  {
    "date": "2026-03-15",
    "total": 9756881,
    "active": 761892,
    "servers": 7898
  },
  {
    "date": "2026-03-16",
    "total": 9775483,
    "active": 761102,
    "servers": 7894
  },
  {
    "date": "2026-03-17",
    "total": 9779768,
    "active": 759838,
    "servers": 7894
  },
  {
    "date": "2026-03-18",
    "total": 9765361,
    "active": 748224,
    "servers": 7879
  },
  {
    "date": "2026-03-19",
    "total": 9768011,
    "active": 744806,
    "servers": 7874
  },
  {
    "date": "2026-03-20",
    "total": 9772799,
    "active": 745079,
    "servers": 7859
  },
  {
    "date": "2026-03-21",
    "total": 9790994,
    "active": 745218,
    "servers": 7853
  },
  {
    "date": "2026-03-22",
    "total": 9793455,
    "active": 744846,
    "servers": 7854
  },
  {
    "date": "2026-03-23",
    "total": 9795946,
    "active": 744350,
    "servers": 7854
  },
  {
    "date": "2026-03-24",
    "total": 9795976,
    "active": 743613,
    "servers": 7855
  },
  {
    "date": "2026-03-25",
    "total": 9776012,
    "active": 747167,
    "servers": 7845
  },
  {
    "date": "2026-03-26",
    "total": 9778278,
    "active": 748769,
    "servers": 7838
  },
  {
    "date": "2026-03-27",
    "total": 9780402,
    "active": 750332,
    "servers": 8155
  },
  {
    "date": "2026-03-28",
    "total": 9770314,
    "active": 751054,
    "servers": 8154
  },
  {
    "date": "2026-03-29",
    "total": 9789690,
    "active": 750616,
    "servers": 8147
  },
  {
    "date": "2026-03-30",
    "total": 9789850,
    "active": 748687,
    "servers": 8146
  },
  {
    "date": "2026-03-31",
    "total": 9789830,
    "active": 748520,
    "servers": 8134
  },
  {
    "date": "2026-04-01",
    "total": 9793639,
    "active": 749011,
    "servers": 8141
  },
  {
    "date": "2026-04-02",
    "total": 9796111,
    "active": 748278,
    "servers": 8156
  },
  {
    "date": "2026-04-03",
    "total": 9788370,
    "active": 746626,
    "servers": 8141
  },
  {
    "date": "2026-04-04",
    "total": 9789236,
    "active": 744698,
    "servers": 8138
  },
  {
    "date": "2026-04-05",
    "total": 9801108,
    "active": 745920,
    "servers": 8132
  },
  {
    "date": "2026-04-06",
    "total": 9792971,
    "active": 744094,
    "servers": 8118
  },
  {
    "date": "2026-04-07",
    "total": 9795816,
    "active": 744758,
    "servers": 8107
  },
  {
    "date": "2026-04-08",
    "total": 9753980,
    "active": 740865,
    "servers": 8113
  },
  {
    "date": "2026-04-09",
    "total": 9789972,
    "active": 743779,
    "servers": 8114
  },
  {
    "date": "2026-04-10",
    "total": 9800939,
    "active": 744097,
    "servers": 8101
  },
  {
    "date": "2026-04-11",
    "total": 9806436,
    "active": 744100,
    "servers": 8091
  },
  {
    "date": "2026-04-12",
    "total": 9809220,
    "active": 743606,
    "servers": 8139
  },
  {
    "date": "2026-04-13",
    "total": 9811563,
    "active": 743902,
    "servers": 8131
  },
  {
    "date": "2026-04-14",
    "total": 9808368,
    "active": 743292,
    "servers": 8125
  },
  {
    "date": "2026-04-15",
    "total": 9815970,
    "active": 744290,
    "servers": 8122
  },
  {
    "date": "2026-04-16",
    "total": 9820522,
    "active": 743533,
    "servers": 8132
  },
  {
    "date": "2026-04-17",
    "total": 9820174,
    "active": 743525,
    "servers": 8129
  },
  {
    "date": "2026-04-18",
    "total": 9822320,
    "active": 743757,
    "servers": 8123
  },
  {
    "date": "2026-04-19",
    "total": 9819297,
    "active": 742798,
    "servers": 8113
  },
  {
    "date": "2026-04-20",
    "total": 9821337,
    "active": 741253,
    "servers": 8137
  },
  {
    "date": "2026-04-21",
    "total": 9823346,
    "active": 739786,
    "servers": 8135
  },
  {
    "date": "2026-04-22",
    "total": 9827611,
    "active": 740892,
    "servers": 8123
  },
  {
    "date": "2026-04-23",
    "total": 9833781,
    "active": 740780,
    "servers": 8131
  },
  {
    "date": "2026-04-24",
    "total": 9835344,
    "active": 740331,
    "servers": 8106
  },
  {
    "date": "2026-04-25",
    "total": 9837092,
    "active": 738891,
    "servers": 8105
  },
  {
    "date": "2026-04-26",
    "total": 9838625,
    "active": 738397,
    "servers": 8111
  },
  {
    "date": "2026-04-27",
    "total": 9841144,
    "active": 738432,
    "servers": 8175
  },
  {
    "date": "2026-04-28",
    "total": 9843531,
    "active": 737441,
    "servers": 8166
  },
  {
    "date": "2026-04-29",
    "total": 10255811,
    "active": 745550,
    "servers": 8146,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2026-04-30",
    "total": 10257591,
    "active": 745040,
    "servers": 8137
  },
  {
    "date": "2026-05-01",
    "total": 10256752,
    "active": 743763,
    "servers": 8128
  },
  {
    "date": "2026-05-02",
    "total": 10258358,
    "active": 742309,
    "servers": 8107
  },
  {
    "date": "2026-05-03",
    "total": 10260927,
    "active": 740524,
    "servers": 8103
  },
  {
    "date": "2026-05-04",
    "total": 10262654,
    "active": 740496,
    "servers": 8088
  },
  {
    "date": "2026-05-05",
    "total": 10268531,
    "active": 741544,
    "servers": 8110
  },
  {
    "date": "2026-05-06",
    "total": 10272351,
    "active": 748061,
    "servers": 8104
  },
  {
    "date": "2026-05-07",
    "total": 10272718,
    "active": 748132,
    "servers": 8091
  },
  {
    "date": "2026-05-08",
    "total": 10275793,
    "active": 749143,
    "servers": 8091
  },
  {
    "date": "2026-05-09",
    "total": 10277186,
    "active": 748995,
    "servers": 8076
  },
  {
    "date": "2026-05-10",
    "total": 10279830,
    "active": 749615,
    "servers": 8072
  },
  {
    "date": "2026-05-11",
    "total": 10282198,
    "active": 750289,
    "servers": 8069
  },
  {
    "date": "2026-05-12",
    "total": 10295582,
    "active": 749320,
    "servers": 8067
  },
  {
    "date": "2026-05-13",
    "total": 10297989,
    "active": 749403,
    "servers": 8066
  },
  {
    "date": "2026-05-14",
    "total": 10300529,
    "active": 749544,
    "servers": 8059
  },
  {
    "date": "2026-05-15",
    "total": 10303067,
    "active": 747842,
    "servers": 8050
  },
  {
    "date": "2026-05-16",
    "total": 10071461,
    "active": 749065,
    "servers": 8046,
    "flags": [
      "total"
    ]
  },
  {
    "date": "2026-05-17",
    "total": 10302578,
    "active": 749400,
    "servers": 8102
  },
  {
    "date": "2026-05-18",
    "total": 10303430,
    "active": 749094,
    "servers": 8090
  },
  {
    "date": "2026-05-19",
    "total": 10304905,
    "active": 749704,
    "servers": 8083
  },
  {
    "date": "2026-05-20",
    "total": 10308665,
    "active": 749611,
    "servers": 8077
  },
  {
    "date": "2026-05-21",
    "total": 10311458,
    "active": 749582,
    "servers": 8074
  },
  {
    "date": "2026-05-22",
    "total": 10312361,
    "active": 749694,
    "servers": 8080
  },
  {
    "date": "2026-05-23",
    "total": 10314211,
    "active": 749080,
    "servers": 8064
  },
  {
    "date": "2026-05-24",
    "total": 10315243,
    "active": 748638,
    "servers": 8055
  },
  {
    "date": "2026-05-25",
    "total": 10317964,
    "active": 748335,
    "servers": 8058
  },
  {
    "date": "2026-05-26",
    "total": 10320240,
    "active": 747102,
    "servers": 8045
  },
  {
    "date": "2026-05-27",
    "total": 10296676,
    "active": 745195,
    "servers": 8055
  },
  {
    "date": "2026-05-28",
    "total": 10299498,
    "active": 744653,
    "servers": 8074
  },
  {
    "date": "2026-05-29",
    "total": 10300930,
    "active": 745235,
    "servers": 8064
  },
  {
    "date": "2026-05-30",
    "total": 10299921,
    "active": 745144,
    "servers": 8059
  },
  {
    "date": "2026-05-31",
    "total": 10327661,
    "active": 746000,
    "servers": 8057
  },
  {
    "date": "2026-06-01",
    "total": 10322737,
    "active": 743917,
    "servers": 8051
  },
  {
    "date": "2026-06-02",
    "total": 10322288,
    "active": 739924,
    "servers": 8034
  },
  {
    "date": "2026-06-03",
    "total": 10335717,
    "active": 738278,
    "servers": 8029
  },
  {
    "date": "2026-06-04",
    "total": 10333666,
    "active": 735053,
    "servers": 8031
  },
  {
    "date": "2026-06-05",
    "total": 10336360,
    "active": 733894,
    "servers": 8030
  },
  {
    "date": "2026-06-06",
    "total": 10310276,
    "active": 731586,
    "servers": 8007
  },
  {
    "date": "2026-06-07",
    "total": 10298053,
    "active": 732621,
    "servers": 8020
  },
  {
    "date": "2026-06-08",
    "total": 10316685,
    "active": 731845,
    "servers": 8044
  },
  {
    "date": "2026-06-09",
    "total": 10321410,
    "active": 731745,
    "servers": 8025
  },
  {
    "date": "2026-06-10",
    "total": 10321523,
    "active": 729632,
    "servers": 8035
  },
  {
    "date": "2026-06-11",
    "total": 10326713,
    "active": 734091,
    "servers": 8037
  },
  {
    "date": "2026-06-12",
    "total": 10334372,
    "active": 736960,
    "servers": 8022
  },
  {
    "date": "2026-06-13",
    "total": 10331394,
    "active": 731471,
    "servers": 8006
  },
  {
    "date": "2026-06-14",
    "total": 10333559,
    "active": 732171,
    "servers": 7998
  },
  {
    "date": "2026-06-15",
    "total": 10293455,
    "active": 728174,
    "servers": 7996
  },
  {
    "date": "2026-06-16",
    "total": 10363369,
    "active": 735068,
    "servers": 8008
  },
  {
    "date": "2026-06-17",
    "total": 10365225,
    "active": 738043,
    "servers": 8000
  },
  {
    "date": "2026-06-18",
    "total": 10363050,
    "active": 735633,
    "servers": 7979
  },
  {
    "date": "2026-06-19",
    "total": 10353199,
    "active": 732800,
    "servers": 7967
  },
  {
    "date": "2026-06-20",
    "total": 10365538,
    "active": 733788,
    "servers": 7957
  },
  {
    "date": "2026-06-21",
    "total": 10372566,
    "active": 734308,
    "servers": 7960
  },
  {
    "date": "2026-06-22",
    "total": 10361453,
    "active": 732353,
    "servers": 7961
  },
  {
    "date": "2026-06-23",
    "total": 10362954,
    "active": 732031,
    "servers": 7946
  },
  {
    "date": "2026-06-24",
    "total": 10376129,
    "active": 733157,
    "servers": 7941
  },
  {
    "date": "2026-06-25",
    "total": 10380172,
    "active": 717684,
    "servers": 7929
  },
  {
    "date": "2026-06-26",
    "total": 10378401,
    "active": 720012
  },
  {
    "date": "2026-06-27",
    "total": 10384959,
    "active": 721864,
    "servers": 7897
  },
  {
    "date": "2026-06-28",
    "total": 10386712,
    "active": 723003,
    "servers": 7897
  },
  {
    "date": "2026-06-29",
    "total": 10365097,
    "active": 722406,
    "servers": 7906
  },
  {
    "date": "2026-06-30",
    "total": 10367308,
    "active": 722819,
    "servers": 7900
  },
  {
    "date": "2026-07-01",
    "total": 10368172,
    "active": 722515,
    "servers": 7891
  },
  {
    "date": "2026-07-02",
    "total": 10357539,
    "active": 722143,
    "servers": 7894
  },
  {
    "date": "2026-07-03",
    "total": 10395689,
    "active": 727460,
    "servers": 7880
  },
  {
    "date": "2026-07-04",
    "total": 10396110,
    "active": 727118,
    "servers": 7869
  },
  {
    "date": "2026-07-05",
    "total": 10398291,
    "active": 726229,
    "servers": 7865
  },
  {
    "date": "2026-07-06",
    "total": 10400957,
    "active": 726704,
    "servers": 7862
  },
  {
    "date": "2026-07-07",
    "total": 10402724,
    "active": 727126,
    "servers": 7862
  },
  {
    "date": "2026-07-08",
    "total": 10404064,
    "active": 726745,
    "servers": 7846
  },
  {
    "date": "2026-07-09",
    "total": 10378111,
    "active": 721924,
    "servers": 7832
  },
  {
    "date": "2026-07-10",
    "total": 10382846,
    "active": 720456,
    "servers": 7841
  },
  {
    "date": "2026-07-11",
    "total": 10385677,
    "active": 719926,
    "servers": 7833
  },
  {
    "date": "2026-07-12",
    "total": 10413410,
    "active": 720849,
    "servers": 7830
  },
  {
    "date": "2026-07-13",
    "total": 10414753,
    "active": 720104,
    "servers": 7830
  },
  {
    "date": "2026-07-14",
    "total": 10410773,
    "active": 720757,
    "servers": 7822
  },
  {
    "date": "2026-07-15",
    "total": 10419040,
    "active": 721633,
    "servers": 7822
  },
  {
    "date": "2026-07-16",
    "total": 10404795,
    "active": 721776,
    "servers": 7822
  },
  {
    "date": "2026-07-17",
    "total": 10378871,
    "active": 723041,
    "servers": 7816
  },
  {
    "date": "2026-07-18",
    "total": 10380206,
    "active": 723019,
    "servers": 7812
  },
  {
    "date": "2026-07-19",
    "total": 10380649,
    "active": 723754,
    "servers": 7794
  },
  {
    "date": "2026-07-20",
    "total": 10356613,
    "active": 722334,
    "servers": 7798
  },
  {
    "date": "2026-07-21",
    "total": 10360207,
    "active": 722347,
    "servers": 7787
  },
  {
    "date": "2026-07-22",
    "total": 10090061,
    "active": 684852,
    "servers": 7784,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2026-07-23",
    "total": 10065852,
    "active": 682890,
    "servers": 7780
  },
  {
    "date": "2026-07-24",
    "total": 10093254,
    "active": 684123,
    "servers": 7777
  },
  {
    "date": "2026-07-25",
    "total": 10091546,
    "active": 681905,
    "servers": 7770
  },
  {
    "date": "2026-07-26",
    "total": 10105350,
    "active": 682343,
    "servers": 7777
  },
  {
    "date": "2026-07-27",
    "total": 10106891,
    "active": 681557,
    "servers": 7784
  },
  {
    "date": "2026-07-28",
    "total": 10108263,
    "active": 680734,
    "servers": 7774
  },
  {
    "date": "2026-07-29",
    "total": 10107467,
    "active": 679365,
    "servers": 7763
  },
  {
    "date": "2026-07-30",
    "total": 10098486,
    "active": 678103,
    "servers": 7754
  },
  {
    "date": "2026-07-31",
    "total": 10075315,
    "active": 675928,
    "servers": 7760
  },
  {
    "date": "2026-08-01",
    "total": 10102204,
    "active": 680103,
    "servers": 7759
  },
  {
    "date": "2026-08-02",
    "total": 10102850,
    "active": 682005,
    "servers": 7751
  },
  {
    "date": "2026-08-03",
    "total": 10116825,
    "active": 683375,
    "servers": 7743
  },
  {
    "date": "2026-08-04",
    "total": 10107669,
    "active": 681787,
    "servers": 7737
  },
  {
    "date": "2026-08-05",
    "total": 10076201,
    "active": 666005,
    "servers": 7734,
    "flags": [
      "active"
    ]
  },
  {
    "date": "2026-08-06",
    "total": 10076942,
    "active": 665056,
    "servers": 7729
  },
  {
    "date": "2026-08-07",
    "total": 10114527,
    "active": 666121,
    "servers": 7728
  },
  {
    "date": "2026-08-08",
    "total": 10118215,
    "active": 665907,
    "servers": 7727
  },
  {
    "date": "2026-08-09",
    "total": 10145963,
    "active": 666587,
    "servers": 7721
  },
  {
    "date": "2026-08-10",
    "total": 10149640,
    "active": 666971,
    "servers": 7719
  },
  {
    "date": "2026-08-11",
    "total": 10145692,
    "active": 664115,
    "servers": 7700
  },
  {
    "date": "2026-08-12",
    "total": 10147470,
    "active": 664486,
    "servers": 7708
  },
  {
    "date": "2026-08-13",
    "total": 10154373,
    "active": 666133,
    "servers": 7712
  },
  {
    "date": "2026-08-14",
    "total": 10155571,
    "active": 666269,
    "servers": 7697
  },
  {
    "date": "2026-08-15",
    "total": 10156099,
    "active": 666036,
    "servers": 7698
  },
  {
    "date": "2026-08-16",
    "total": 10158245,
    "active": 665465,
    "servers": 7694
  },
  {
    "date": "2026-08-17",
    "total": 10160269,
    "active": 664975,
    "servers": 7689
  },
  {
    "date": "2026-08-18",
    "total": 10157003,
    "active": 664822,
    "servers": 7672
  },
  {
    "date": "2026-08-19",
    "total": 10158554,
    "active": 665975,
    "servers": 7644
  },
  {
    "date": "2026-08-20",
    "total": 10157330,
    "active": 665845,
    "servers": 7646
  },
  {
    "date": "2026-08-21",
    "total": 10132203,
    "active": 669453,
    "servers": 7629
  },
  {
    "date": "2026-08-22",
    "total": 10134346,
    "active": 665716,
    "servers": 7604
  },
  {
    "date": "2026-08-23",
    "total": 10136003,
    "active": 667241,
    "servers": 7604
  },
  {
    "date": "2026-08-24",
    "total": 10136003,
    "active": 669336,
    "servers": 7609
  },
  {
    "date": "2026-08-25",
    "total": 10142215,
    "active": 671345,
    "servers": 7609
  },
  {
    "date": "2026-08-26",
    "total": 10145564,
    "active": 673288,
    "servers": 7612
  },
  {
    "date": "2026-08-27",
    "total": 10153560,
    "active": 674461,
    "servers": 7603
  },
  {
    "date": "2026-08-28",
    "total": 10161556,
    "active": 675634,
    "servers": 7609
  },
  {
    "date": "2026-08-29",
    "total": 10156196,
    "active": 673504,
    "servers": 7607
  },
  {
    "date": "2026-08-30",
    "total": 10165360,
    "active": 672454,
    "servers": 7605
  },
  {
    "date": "2026-08-31",
    "total": 10167026,
    "active": 672105,
    "servers": 7597
  },
  {
    "date": "2026-09-01",
    "total": 10168964,
    "active": 672673,
    "servers": 7587
  },
  {
    "date": "2026-09-02",
    "total": 10148591,
    "active": 669453,
    "servers": 7583
  },
  {
    "date": "2026-09-03",
    "total": 10151829,
    "active": 669180,
    "servers": 7578
  },
  {
    "date": "2026-09-04",
    "total": 10141438,
    "active": 667230
  },
  {
    "date": "2026-09-05",
    "total": 10141940,
    "active": 666966
  },
  {
    "date": "2026-09-06",
    "total": 10143687,
    "active": 667015
  },
  {
    "date": "2026-09-07",
    "total": 10143424,
    "active": 666245
  },
  {
    "date": "2026-09-08",
    "total": 10127834,
    "active": 664434
  },
  {
    "date": "2026-09-09",
    "total": 10130347,
    "active": 668881
  },
  {
    "date": "2026-09-10",
    "total": 10146411,
    "active": 672080
  },
  {
    "date": "2026-09-11",
    "total": 10160952,
    "active": 673590
  },
  {
    "date": "2026-09-12",
    "total": 10164575,
    "active": 675016,
    "servers": 7521
  },
  {
    "date": "2026-09-13",
    "total": 10174990,
    "active": 676389,
    "servers": 7518
  },
  {
    "date": "2026-09-14",
    "total": 10477169,
    "active": 716629,
    "servers": 7523,
    "flags": [
      "total",
      "active"
    ]
  },
  {
    "date": "2026-09-15",
    "total": 10479397,
    "active": 718669,
    "servers": 7530
  },
  {
    "date": "2026-09-16",
    "total": 10443497,
    "active": 719962,
    "servers": 7508
  },
  {
    "date": "2026-09-17",
    "total": 10443546,
    "active": 720394,
    "servers": 7496
  },
  {
    "date": "2026-09-18",
    "total": 10444488,
    "active": 721169,
    "servers": 7482
  },
  {
    "date": "2026-09-19",
    "total": 10445855,
    "active": 720640,
    "servers": 7464
  },
  {
    "date": "2026-09-20",
    "total": 10443777,
    "active": 720545,
    "servers": 7454
  },
  {
    "date": "2026-09-21",
    "total": 10446843,
    "active": 719543,
    "servers": 7466
  },
  {
    "date": "2026-09-22",
    "total": 10414282,
    "active": 716597,
    "servers": 7467
  },
  {
    "date": "2026-09-23",
    "total": 10469789,
    "active": 721975,
    "servers": 7461
  },
  {
    "date": "2026-09-24",
    "total": 10471751,
    "active": 723744,
    "servers": 7443
  },
  {
    "date": "2026-09-25",
    "total": 10473343,
    "active": 725578,
    "servers": 7447
  },
  {
    "date": "2026-09-26",
    "total": 10475547,
    "active": 725165,
    "servers": 7436
  },
  {
    "date": "2026-09-27",
    "total": 10473418,
    "active": 726865,
    "servers": 7431
  },
  {
    "date": "2026-09-28",
    "total": 10468410,
    "active": 721112,
    "servers": 7431
  },
  {
    "date": "2026-09-29",
    "total": 10482245,
    "active": 721361,
    "servers": 7443
  },
  {
    "date": "2026-09-30",
    "total": 10473034,
    "active": 721584,
    "servers": 7440
  },
  {
    "date": "2026-10-01",
    "total": 10477390,
    "active": 723442,
    "servers": 7432
  },
  {
    "date": "2026-10-02",
    "total": 10475867,
    "active": 726516,
    "servers": 7421
  },
  {
    "date": "2026-10-03",
    "total": 10477234,
    "active": 727356,
    "servers": 7409
  },
  {
    "date": "2026-10-04",
    "total": 10479307,
    "active": 727091,
    "servers": 7412
  },
  {
    "date": "2026-10-05",
    "total": 10464212,
    "active": 724976,
    "servers": 7400
  },
  {
    "date": "2026-10-06",
    "total": 10483172,
    "active": 725614,
    "servers": 7399
  },
  {
    "date": "2026-10-07",
    "total": 10484794,
    "active": 724713,
    "servers": 7401
  },
  {
    "date": "2026-10-08",
    "total": 10485345,
    "active": 723580,
    "servers": 7384
  },
  {
    "date": "2026-10-09",
    "total": 10496537,
    "active": 726249,
    "servers": 7383
  },
  {
    "date": "2026-10-10",
    "total": 10501116,
    "active": 728205,
    "servers": 7385
  },
  {
    "date": "2026-10-11",
    "total": 10503903,
    "active": 728997,
    "servers": 7384,
    "statuses": 1017649837,
    "statuses_at": "2026-10-12T05:17Z",
    "fedi_users": 8818464,
    "fedi_instances": 8694
  },
  {
    "date": "2026-10-12",
    "total": 10507420,
    "active": 731765,
    "servers": 7396,
    "statuses": 1019190137,
    "statuses_at": "2026-10-13T10:45Z",
    "fedi_users": 8823477,
    "fedi_instances": 8737
  },
  {
    "date": "2026-10-13",
    "total": 10510872,
    "active": 732383,
    "servers": 7401,
    "statuses": 1019621036,
    "statuses_at": "2026-10-14T08:50Z",
    "fedi_users": 8823864,
    "fedi_instances": 8741
  },
  {
    "date": "2026-10-14",
    "total": 10538972,
    "active": 734707,
    "servers": 7395,
    "statuses": 1019621036,
    "statuses_at": "2026-10-15T08:25Z",
    "fedi_users": 8823864,
    "fedi_instances": 8741
  },
  {
    "date": "2026-10-15",
    "total": 10262917,
    "active": 734968,
    "servers": 7387,
    "statuses": 1012607214,
    "statuses_at": "2026-10-16T08:17Z",
    "fedi_users": 8539713,
    "fedi_instances": 8684
  },
  {
    "date": "2026-10-16",
    "total": 10264608,
    "active": 734916,
    "servers": 7378,
    "statuses": 1010217138,
    "statuses_at": "2026-10-17T07:53Z",
    "fedi_users": 8542649,
    "fedi_instances": 8710
  },
  {
    "date": "2026-10-17",
    "total": 10265374,
    "active": 736569,
    "servers": 7369,
    "statuses": 1015817411,
    "statuses_at": "2026-10-18T08:08Z",
    "fedi_users": 8551088,
    "fedi_instances": 8724
  },
  {
    "date": "2026-10-18",
    "total": 10241101,
    "active": 736646,
    "servers": 7359,
    "statuses": 1004377295,
    "statuses_at": "2026-10-19T09:02Z",
    "fedi_users": 8557740,
    "fedi_instances": 8699
  },
  {
    "date": "2026-10-19",
    "total": 10243907,
    "active": 739812,
    "servers": 7361,
    "statuses": 1012161813,
    "statuses_at": "2026-10-20T08:40Z",
    "fedi_users": 8454616,
    "fedi_instances": 8695
  }
];