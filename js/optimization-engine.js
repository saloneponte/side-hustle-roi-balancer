// 手取り収入最適化エンジン

// 節税・最適化データベース
const OPTIMIZATION_DATABASE = {
    // ふるさと納税
    furusatoNozei: {
        name: "ふるさと納税",
        category: "税額控除",
        maxDeduction: function(income, residentTax, incomeTax) {
            // 住民税所得割額の20%が上限（令和元年以降）
            const limit = Math.min(
                (residentTax * 0.2),
                ((income - 2000) * 0.3) // 3割特例の上限
            );
            return Math.max(0, Math.floor(limit / 1000) * 1000); // 1000円単位
        },
        calculateBenefit: function(donationAmount, income) {
            const selfBurden = 2000; // 自己負担
            const benefit = Math.max(0, donationAmount - selfBurden);
            const returnValue = donationAmount * 0.3; // 平均返礼品価値30%
            return {
                taxReduction: benefit,
                returnValue: returnValue,
                realCost: selfBurden,
                netBenefit: returnValue - selfBurden
            };
        }
    },

    // 小規模企業共済
    smallBusinessMutualAid: {
        name: "小規模企業共済",
        category: "所得控除",
        maxAmount: 840000, // 年間84万円
        eligibility: ["個人事業主", "中小企業経営者"],
        calculateBenefit: function(contributionAmount, taxRate) {
            return {
                taxReduction: contributionAmount * taxRate,
                futureReturn: contributionAmount * 1.02 // 想定年利2%
            };
        }
    },

    // 国民年金基金・確定拠出年金
    pensionPlans: {
        name: "年金制度加入",
        category: "所得控除",
        options: {
            nationalPensionFund: { max: 816000, name: "国民年金基金" },
            personalDC: { max: 276000, name: "個人型確定拠出年金(iDeCo)" }
        },
        calculateBenefit: function(contributionAmount, taxRate) {
            return {
                taxReduction: contributionAmount * taxRate,
                futureValue: contributionAmount * Math.pow(1.03, 20) // 20年3%運用想定
            };
        }
    },

    // 生命保険料控除
    lifeInsurance: {
        name: "生命保険料控除",
        category: "所得控除",
        maxDeduction: {
            life: 40000,
            medicalCare: 40000,
            personalPension: 40000,
            total: 120000
        },
        calculateBenefit: function(premiumAmount, taxRate) {
            const deduction = Math.min(premiumAmount, 40000);
            return {
                taxReduction: deduction * taxRate,
                protection: premiumAmount * 10 // 概算保障額
            };
        }
    }
};

// 経費項目データベース
const EXPENSE_DATABASE = {
    // 在宅勤務関連
    homeOffice: {
        category: "在宅勤務",
        items: [
            { name: "家賃・光熱費", ratio: 0.2, description: "業務用スペースの按分" },
            { name: "インターネット料金", ratio: 0.5, description: "業務利用分" },
            { name: "携帯電話料金", ratio: 0.3, description: "業務通話分" },
            { name: "コピー用紙・文房具", ratio: 1.0, description: "業務専用" }
        ]
    },

    // 機器・設備
    equipment: {
        category: "機器・設備",
        items: [
            { name: "パソコン", amount: 300000, depreciation: 4, description: "業務用PC（4年償却）" },
            { name: "プリンター", amount: 50000, depreciation: 5, description: "業務用プリンター" },
            { name: "デスク・椅子", amount: 100000, depreciation: 8, description: "業務用家具" },
            { name: "モニター", amount: 80000, depreciation: 5, description: "業務用ディスプレイ" },
            { name: "ソフトウェア", amount: 50000, depreciation: 3, description: "業務用ソフト" }
        ]
    },

    // 移動・交通
    transportation: {
        category: "移動・交通",
        items: [
            { name: "電車・バス代", description: "業務関連の移動費" },
            { name: "タクシー代", description: "深夜業務等での移動" },
            { name: "ガソリン代", ratio: 0.3, description: "業務利用分" },
            { name: "駐車場代", ratio: 0.3, description: "業務利用分" },
            { name: "高速道路料金", description: "業務関連移動" }
        ]
    },

    // 研修・書籍
    education: {
        category: "研修・自己投資",
        items: [
            { name: "専門書籍", description: "業務関連の技術書・参考書" },
            { name: "オンライン講座", description: "Udemy、Coursera等" },
            { name: "セミナー参加費", description: "業務関連研修" },
            { name: "資格取得費用", description: "業務関連資格の受験料" },
            { name: "展示会入場料", description: "業界展示会・見本市" }
        ]
    },

    // 接待・交際
    entertainment: {
        category: "接待・交際",
        items: [
            { name: "クライアント接待費", description: "1人5000円以下推奨" },
            { name: "業務打合せ費用", description: "カフェ・レストランでの打合せ" },
            { name: "年末年始の挨拶", description: "お中元・お歳暮等" },
            { name: "名刺作成費", description: "業務用名刺" }
        ]
    },

    // 広告・宣伝
    advertising: {
        category: "広告・宣伝",
        items: [
            { name: "ウェブサイト制作費", description: "業務用HP制作・維持" },
            { name: "ドメイン・サーバー代", description: "年間維持費" },
            { name: "SNS広告費", description: "Facebook、Google広告等" },
            { name: "チラシ・パンフレット", description: "印刷・デザイン費用" },
            { name: "名刺・ロゴ制作", description: "ブランディング費用" }
        ]
    }
};

// 最適化提案生成エンジン
class OptimizationEngine {
    constructor(userData) {
        this.userData = userData;
        this.currentTax = this.calculateCurrentTax();
        this.optimizations = [];
    }

    calculateCurrentTax() {
        return calculateTax(
            this.userData.salary,
            this.userData.sideIncome,
            this.userData.expenses
        );
    }

    // 包括的な最適化分析
    generateOptimizationPlan() {
        this.optimizations = [];
        
        // 1. ふるさと納税最適化
        this.analyzeFurusatoNozei();
        
        // 2. 経費最適化
        this.analyzeExpenseOptimization();
        
        // 3. 所得控除最適化
        this.analyzeDeductionOptimization();
        
        // 4. 法人化検討
        this.analyzeIncorporationBenefit();
        
        // 5. 投資・運用提案
        this.analyzeInvestmentOptions();

        // 優先度順にソート
        this.optimizations.sort((a, b) => b.priority - a.priority);
        
        return {
            currentTax: this.currentTax,
            optimizations: this.optimizations,
            totalPotentialSaving: this.optimizations.reduce((sum, opt) => sum + opt.annualBenefit, 0)
        };
    }

    // ふるさと納税分析
    analyzeFurusatoNozei() {
        const { residentTax, incomeTax } = this.currentTax;
        const income = this.userData.salary + this.userData.sideIncome - this.userData.expenses;
        
        const maxDonation = OPTIMIZATION_DATABASE.furusatoNozei.maxDeduction(
            income, residentTax, incomeTax
        );
        
        if (maxDonation > 10000) { // 最低1万円以上で提案
            const benefit = OPTIMIZATION_DATABASE.furusatoNozei.calculateBenefit(maxDonation, income);
            
            this.optimizations.push({
                id: 'furusato-nozei',
                category: '税額控除',
                title: 'ふるさと納税活用',
                description: `年間${formatCurrency(maxDonation)}まで寄附可能`,
                annualBenefit: benefit.netBenefit,
                implementation: 'immediate',
                difficulty: 'easy',
                priority: 85,
                details: {
                    maxDonation: maxDonation,
                    taxReduction: benefit.taxReduction,
                    returnValue: benefit.returnValue,
                    realCost: benefit.realCost
                },
                actionSteps: [
                    '年収に応じた寄附上限額を確認',
                    'ふるさと納税サイトで自治体を選択',
                    'ワンストップ特例申請書を提出',
                    '翌年の住民税減額を確認'
                ]
            });
        }
    }

    // 経費最適化分析
    analyzeExpenseOptimization() {
        const currentExpenses = this.userData.expenses || 0;
        let potentialExpenses = 0;
        const expenseCategories = [];

        // 各カテゴリーの潜在的経費を計算
        Object.entries(EXPENSE_DATABASE).forEach(([key, category]) => {
            let categoryTotal = 0;
            const categoryItems = [];

            category.items.forEach(item => {
                let annualAmount = 0;
                
                if (item.amount) {
                    // 減価償却資産
                    annualAmount = item.amount / item.depreciation;
                } else if (item.ratio && key === 'homeOffice') {
                    // 在宅勤務の按分計算
                    switch(item.name) {
                        case '家賃・光熱費':
                            annualAmount = 1200000 * item.ratio; // 月10万円想定
                            break;
                        case 'インターネット料金':
                            annualAmount = 60000 * item.ratio; // 月5千円想定
                            break;
                        case '携帯電話料金':
                            annualAmount = 120000 * item.ratio; // 月1万円想定
                            break;
                        default:
                            annualAmount = 50000; // その他年5万円想定
                    }
                } else {
                    // その他の経費（年間想定額）
                    annualAmount = this.estimateExpenseAmount(item.name);
                }

                if (annualAmount > 0) {
                    categoryTotal += annualAmount;
                    categoryItems.push({
                        ...item,
                        estimatedAmount: annualAmount
                    });
                }
            });

            if (categoryTotal > 0) {
                potentialExpenses += categoryTotal;
                expenseCategories.push({
                    category: category.category,
                    total: categoryTotal,
                    items: categoryItems
                });
            }
        });

        const additionalExpenses = Math.max(0, potentialExpenses - currentExpenses);
        if (additionalExpenses > 100000) { // 10万円以上の追加経費が見込める場合
            const taxSaving = additionalExpenses * (this.userData.marginalTaxRate || 0.25);
            
            this.optimizations.push({
                id: 'expense-optimization',
                category: '経費最適化',
                title: '経費計上の最適化',
                description: `追加で年間${formatCurrency(additionalExpenses)}の経費計上が可能`,
                annualBenefit: taxSaving,
                implementation: 'immediate',
                difficulty: 'medium',
                priority: 90,
                details: {
                    currentExpenses: currentExpenses,
                    potentialExpenses: potentialExpenses,
                    additionalExpenses: additionalExpenses,
                    categories: expenseCategories
                },
                actionSteps: [
                    '経費として計上可能な支出を整理',
                    '領収書・レシートの保管システム構築',
                    '家事按分の割合を適正に設定',
                    '減価償却資産の購入計画策定'
                ]
            });
        }
    }

    // 所得控除最適化分析
    analyzeDeductionOptimization() {
        const income = this.userData.salary + this.userData.sideIncome;
        const marginalTaxRate = this.calculateMarginalTaxRate(income);

        // 小規模企業共済
        if (this.userData.businessType === 'individual') {
            const maxContribution = OPTIMIZATION_DATABASE.smallBusinessMutualAid.maxAmount;
            const benefit = OPTIMIZATION_DATABASE.smallBusinessMutualAid.calculateBenefit(
                maxContribution, marginalTaxRate
            );

            this.optimizations.push({
                id: 'small-business-mutual',
                category: '所得控除',
                title: '小規模企業共済加入',
                description: `年間${formatCurrency(maxContribution)}の掛金で節税`,
                annualBenefit: benefit.taxReduction,
                implementation: 'short-term',
                difficulty: 'easy',
                priority: 80,
                details: {
                    maxContribution: maxContribution,
                    taxReduction: benefit.taxReduction,
                    futureReturn: benefit.futureReturn
                },
                actionSteps: [
                    '加入資格を確認',
                    '金融機関で申込み手続き',
                    '掛金の自動引落し設定',
                    '年末調整・確定申告で控除申請'
                ]
            });
        }

        // 生命保険料控除
        const insuranceContribution = 120000; // 年間12万円想定
        const insuranceBenefit = OPTIMIZATION_DATABASE.lifeInsurance.calculateBenefit(
            insuranceContribution, marginalTaxRate
        );

        this.optimizations.push({
            id: 'life-insurance',
            category: '所得控除',
            title: '生命保険料控除活用',
            description: '生命保険加入で年間12万円の所得控除',
            annualBenefit: insuranceBenefit.taxReduction,
            implementation: 'short-term',
            difficulty: 'easy',
            priority: 60,
            details: {
                maxDeduction: 120000,
                taxReduction: insuranceBenefit.taxReduction,
                protection: insuranceBenefit.protection
            },
            actionSteps: [
                '保険会社・商品を比較検討',
                '必要保障額を算定',
                '生命保険・医療保険・個人年金を組合せ',
                '控除証明書を年末調整で提出'
            ]
        });
    }

    // 法人化メリット分析
    analyzeIncorporationBenefit() {
        const businessIncome = this.userData.sideIncome - this.userData.expenses;
        
        if (businessIncome > 3000000) { // 事業所得300万円以上で検討
            const corporationAnalysis = calculateCorporation(
                this.userData.sideIncome,
                this.userData.expenses,
                this.userData.salary * 0.8, // 役員報酬を給与の8割に設定
                300000 // 法人化費用
            );
            
            const currentNet = this.currentTax.netIncome;
            const corporationNet = corporationAnalysis.netIncome;
            const benefit = corporationNet - currentNet;

            if (benefit > 100000) { // 年間10万円以上のメリットがある場合
                this.optimizations.push({
                    id: 'incorporation',
                    category: '事業形態変更',
                    title: '法人化によるメリット',
                    description: `法人化により年間${formatCurrency(benefit)}の手取り増加`,
                    annualBenefit: benefit,
                    implementation: 'long-term',
                    difficulty: 'hard',
                    priority: 75,
                    details: {
                        currentNet: currentNet,
                        corporationNet: corporationNet,
                        savingAmount: benefit,
                        breakEvenIncome: 5000000 // 概算分岐点
                    },
                    actionSteps: [
                        '税理士・司法書士への相談',
                        '法人設立の準備（定款作成等）',
                        '資本金・事業計画の策定',
                        '法人口座開設・届出提出'
                    ]
                });
            }
        }
    }

    // 投資・運用提案
    analyzeInvestmentOptions() {
        const availableFunds = this.currentTax.netIncome * 0.1; // 手取りの10%を投資に回せると仮定
        
        if (availableFunds > 100000) {
            // つみたてNISA
            const nisaAmount = Math.min(availableFunds, 400000); // 年間40万円上限
            const nisa10YearReturn = nisaAmount * 10 * Math.pow(1.05, 10); // 10年5%運用想定

            this.optimizations.push({
                id: 'tsumitate-nisa',
                category: '資産運用',
                title: 'つみたてNISA活用',
                description: `年間${formatCurrency(nisaAmount)}の非課税投資枠を活用`,
                annualBenefit: nisaAmount * 0.05 * 0.2, // 5%運用の20%税金分が節税効果
                implementation: 'immediate',
                difficulty: 'easy',
                priority: 70,
                details: {
                    annualInvestment: nisaAmount,
                    expectedReturn10Years: nisa10YearReturn,
                    taxSaving: nisaAmount * 0.05 * 0.2
                },
                actionSteps: [
                    '証券会社でNISA口座開設',
                    '投資信託商品を選択',
                    '自動積立設定',
                    '年間投資枠の管理'
                ]
            });
        }
    }

    // 限界税率計算
    calculateMarginalTaxRate(income) {
        // 簡易的な限界税率計算
        if (income <= 1950000) return 0.15; // 所得税5% + 住民税10%
        if (income <= 3300000) return 0.20; // 所得税10% + 住民税10%
        if (income <= 6950000) return 0.30; // 所得税20% + 住民税10%
        if (income <= 9000000) return 0.33; // 所得税23% + 住民税10%
        return 0.43; // 所得税33% + 住民税10%
    }

    // 経費推定額計算
    estimateExpenseAmount(itemName) {
        const estimates = {
            '専門書籍': 100000,
            'オンライン講座': 150000,
            'セミナー参加費': 200000,
            '資格取得費用': 100000,
            'クライアント接待費': 150000,
            'ウェブサイト制作費': 300000,
            'ドメイン・サーバー代': 30000,
            'SNS広告費': 200000
        };
        return estimates[itemName] || 50000;
    }
}

// 最適化シミュレーター
class OptimizationSimulator {
    constructor(userData, optimizations) {
        this.userData = userData;
        this.optimizations = optimizations;
    }

    // 最適化案を適用した場合のシミュレーション
    simulateOptimization(selectedOptimizations) {
        let totalBenefit = 0;
        let implementationCost = 0;
        let monthlyActions = [];
        let oneTimeActions = [];

        selectedOptimizations.forEach(opt => {
            const optimization = this.optimizations.find(o => o.id === opt.id);
            if (optimization) {
                totalBenefit += optimization.annualBenefit * (opt.applicableRate || 1);
                
                // 実装コスト計算
                if (optimization.implementation === 'immediate') {
                    implementationCost += 10000; // 手続き費用等
                } else if (optimization.implementation === 'long-term') {
                    implementationCost += 300000; // 法人化等の費用
                }

                // アクション分類
                if (optimization.implementation === 'immediate') {
                    monthlyActions.push(optimization.title);
                } else {
                    oneTimeActions.push(optimization.title);
                }
            }
        });

        return {
            currentNetIncome: this.userData.currentTax?.netIncome || 0,
            optimizedNetIncome: (this.userData.currentTax?.netIncome || 0) + totalBenefit,
            totalBenefit: totalBenefit,
            implementationCost: implementationCost,
            roi: implementationCost > 0 ? (totalBenefit / implementationCost) * 100 : 0,
            paybackPeriod: implementationCost > 0 ? Math.ceil(implementationCost / (totalBenefit / 12)) : 0,
            monthlyActions: monthlyActions,
            oneTimeActions: oneTimeActions
        };
    }

    // 最適化ロードマップ生成
    generateRoadmap(selectedOptimizations) {
        const roadmap = [];
        
        // 優先度と実装時期でソート
        const sortedOpts = selectedOptimizations
            .map(opt => this.optimizations.find(o => o.id === opt.id))
            .filter(opt => opt)
            .sort((a, b) => {
                if (a.implementation !== b.implementation) {
                    const order = { 'immediate': 1, 'short-term': 2, 'long-term': 3 };
                    return order[a.implementation] - order[b.implementation];
                }
                return b.priority - a.priority;
            });

        let month = 1;
        sortedOpts.forEach(opt => {
            roadmap.push({
                month: month,
                title: opt.title,
                description: opt.description,
                difficulty: opt.difficulty,
                expectedBenefit: opt.annualBenefit,
                actionSteps: opt.actionSteps
            });

            // 実装期間を考慮して次の月を設定
            if (opt.implementation === 'immediate') {
                month += 1;
            } else if (opt.implementation === 'short-term') {
                month += 2;
            } else {
                month += 6;
            }
        });

        return roadmap;
    }
}

// ユーティリティ関数
function formatCurrency(amount) {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatPercentage(rate) {
    return (rate).toFixed(1) + '%';
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        OptimizationEngine,
        OptimizationSimulator,
        OPTIMIZATION_DATABASE,
        EXPENSE_DATABASE
    };
}