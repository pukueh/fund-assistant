"""基金估值助手 - 使用 HelloAgents 框架的主入口"""

import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from hello_agents import HelloAgentsLLM

# 导入 Agents
from agents import (
    create_coordinator_agent,
    create_quant_agent,
    create_analyst_agent,
    create_advisor_agent,
    create_strategist_agent
)


def demo_agents():
    """演示各个 Agent"""
    print("=" * 60)
    print("🚀 基金估值助手 - HelloAgents 框架演示")
    print("=" * 60)
    
    # 创建共享 LLM
    llm = HelloAgentsLLM()
    
    # 1. 协调员演示
    print("\n📋 CoordinatorAgent (ReActAgent) 演示")
    print("-" * 40)
    coordinator = create_coordinator_agent(llm)
    try:
        response = coordinator.run("查看我的持仓估值")
        print(f"回复: {response}")
    except Exception as e:
        print(f"错误: {e}")
    
    # 2. 量化分析演示
    print("\n📊 QuantAgent (SimpleAgent) 演示")
    print("-" * 40)
    quant = create_quant_agent(llm)
    try:
        response = quant.run("分析110011这只基金的风险")
        print(f"回复: {response}")
    except Exception as e:
        print(f"错误: {e}")
    
    # 3. 技术分析演示
    print("\n📈 AnalystAgent (ReflectionAgent) 演示")
    print("-" * 40)
    analyst = create_analyst_agent(llm)
    try:
        response = analyst.run("分析白酒板块走势")
        print(f"回复: {response}")
    except Exception as e:
        print(f"错误: {e}")
    
    # 4. 投资顾问演示
    print("\n💼 AdvisorAgent (PlanAndSolveAgent) 演示")
    print("-" * 40)
    advisor = create_advisor_agent(llm)
    try:
        response = advisor.run("我有5万闲钱，风险承受能力中等，如何配置基金？")
        print(f"回复: {response}")
    except Exception as e:
        print(f"错误: {e}")
    
    # 5. 策略师演示
    print("\n🎯 StrategistAgent (ReActAgent) 演示")
    print("-" * 40)
    strategist = create_strategist_agent(llm)
    try:
        response = strategist.run("市场波动大，我应该怎么调整持仓？")
        print(f"回复: {response}")
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 演示完成！")
    print("=" * 60)


def interactive_mode():
    """交互式模式"""
    print("=" * 60)
    print("🤖 基金估值助手 - 交互模式")
    print("=" * 60)
    print("输入 'quit' 退出")
    
    llm = HelloAgentsLLM()
    
    # 创建策略师作为主入口
    agent = create_strategist_agent(llm)
    
    while True:
        try:
            user_input = input("\n👤 你: ").strip()
            if user_input.lower() in ['quit', 'exit', '退出']:
                print("👋 再见！")
                break
            
            if not user_input:
                continue
            
            response = agent.run(user_input)
            print(f"\n🤖 助手: {response}")
            
        except KeyboardInterrupt:
            print("\n👋 再见！")
            break
        except Exception as e:
            print(f"❌ 错误: {e}")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="基金估值助手 - HelloAgents 框架版")
    parser.add_argument("--mode", choices=["demo", "cli", "web"], default="demo",
                        help="运行模式: demo(演示), cli(交互), web(服务)")
    args = parser.parse_args()
    
    if args.mode == "demo":
        demo_agents()
    elif args.mode == "cli":
        interactive_mode()
    elif args.mode == "web":
        from server import run_server
        run_server()


if __name__ == "__main__":
    main()
